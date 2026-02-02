/**
 * API Route: Portail client Stripe
 * POST /api/stripe/portal
 * 
 * Crée une session pour le portail client Stripe
 * où l'utilisateur peut gérer son abonnement
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe n'est pas configuré" },
        { status: 503 }
      );
    }

    const { organizationId } = await request.json();

    // Vérifier l'authentification
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier les permissions
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      );
    }

    // Récupérer le customer_id
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", organizationId)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "Aucun abonnement actif" },
        { status: 400 }
      );
    }

    // Créer la session du portail
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[Stripe Portal] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
