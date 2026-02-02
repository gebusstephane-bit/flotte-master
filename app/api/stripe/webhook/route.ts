/**
 * API Route: Webhook Stripe
 * POST /api/stripe/webhook
 * 
 * Gère les événements Stripe:
 * - checkout.session.completed
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * - customer.subscription.deleted
 * - customer.subscription.updated
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe n'est pas configuré" },
        { status: 503 }
      );
    }

    const payload = await request.text();
    const signature = request.headers.get("stripe-signature") || "";

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Gérer les différents événements
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          // Récupérer l'abonnement Stripe
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Mettre à jour la base de données
          await handleSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        
        const subId = (invoice as any).subscription;
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await handleSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Mettre à jour le statut de l'abonnement
        const subId = (invoice as any).subscription;
        if (subId) {
          await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subId = (subscription as any).id;
        
        // Récupérer l'organization_id
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("organization_id")
          .eq("stripe_subscription_id", subId)
          .single();

        if (sub) {
          // Mettre à jour le statut
          await supabase
            .from("subscriptions")
            .update({
              status: "canceled",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id);

          // Repasser l'organisation en plan gratuit
          await supabase
            .from("organizations")
            .update({
              plan: "free",
              max_vehicles: 3,
              max_users: 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sub.organization_id);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}

/**
 * Gérer la mise à jour d'un abonnement
 */
async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organization_id;

  if (!organizationId) {
    console.error("[Stripe Webhook] No organization_id in subscription metadata");
    return;
  }

  // Récupérer le price pour déterminer le plan
  const price = subscription.items.data[0]?.price;
  const priceId = price?.id;

  // Déterminer le plan
  let plan = "starter";
  const { PLANS } = await import("@/lib/stripe");
  
  if (priceId === PLANS.pro.priceId) {
    plan = "pro";
  } else if (priceId === PLANS.enterprise.priceId) {
    plan = "enterprise";
  }

  // Mettre à jour ou créer l'abonnement
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .single();

  const subscriptionData = {
    organization_id: organizationId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    plan,
    status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (existingSub) {
    await supabase
      .from("subscriptions")
      .update(subscriptionData)
      .eq("id", existingSub.id);
  } else {
    await supabase
      .from("subscriptions")
      .insert({
        ...subscriptionData,
        created_at: new Date().toISOString(),
      });
  }

  // Mettre à jour l'organisation
  const limits = PLANS[plan]?.limits || { vehicles: 10, users: 3 };
  
  await supabase
    .from("organizations")
    .update({
      plan,
      max_vehicles: limits.vehicles,
      max_users: limits.users,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);
}

// Note: Dans Next.js App Router, le body n'est pas parsé par défaut pour les routes API
// Le parsing est géré manuellement avec request.text()
