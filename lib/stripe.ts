/**
 * STRIPE INTEGRATION
 * 
 * Gestion des paiements et abonnements
 */

import Stripe from "stripe";

// Initialiser Stripe côté serveur
const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey 
  ? new Stripe(stripeKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    })
  : null as unknown as Stripe;

// Helper pour vérifier si Stripe est configuré
export function isStripeConfigured(): boolean {
  return !!stripeKey && !!process.env.STRIPE_WEBHOOK_SECRET;
}

// Prix Stripe (à configurer dans le dashboard Stripe)
export const STRIPE_PRICES = {
  starter: process.env.STRIPE_PRICE_STARTER || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "",
};

// Plans disponibles
export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceId: string;
  features: string[];
  limits: {
    vehicles: number;
    users: number;
  };
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Gratuit",
    description: "Parfait pour tester",
    price: 0,
    priceId: "",
    features: [
      "Jusqu'à 3 véhicules",
      "1 utilisateur",
      "Inspections QR",
      "Dashboard basique",
    ],
    limits: {
      vehicles: 3,
      users: 1,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "Pour les petites flottes",
    price: 29,
    priceId: STRIPE_PRICES.starter,
    features: [
      "Jusqu'à 10 véhicules",
      "3 utilisateurs",
      "Toutes les fonctionnalités",
      "Support email",
    ],
    limits: {
      vehicles: 10,
      users: 3,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Pour les flottes en croissance",
    price: 79,
    priceId: STRIPE_PRICES.pro,
    features: [
      "Jusqu'à 50 véhicules",
      "10 utilisateurs",
      "API access",
      "Support prioritaire",
    ],
    limits: {
      vehicles: 50,
      users: 10,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Sur mesure",
    price: 0,
    priceId: STRIPE_PRICES.enterprise,
    features: [
      "Véhicules illimités",
      "Utilisateurs illimités",
      "Support dédié",
      "Personnalisation",
    ],
    limits: {
      vehicles: -1, // Illimité
      users: -1,
    },
  },
};

// Types d'abonnement
export interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// Status de l'abonnement
export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
  trialing: "Essai",
  active: "Actif",
  past_due: "En retard",
  canceled: "Annulé",
  unpaid: "Non payé",
  paused: "En pause",
};
