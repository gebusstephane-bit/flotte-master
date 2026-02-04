"use client";

/**
 * PAGE: Billing / Abonnement
 * Gestion de l'abonnement Stripe
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PLANS, SUBSCRIPTION_STATUS_LABELS, type SubscriptionStatus } from "@/lib/stripe";
import {
  CreditCard,
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Package,
  Users,
  Calendar,
  Building2,
} from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  max_vehicles: number;
  max_users: number;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);

      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non authentifié");
        return;
      }

      // Récupérer l'organisation de l'utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.current_organization_id) {
        toast.error("Aucune organisation trouvée");
        return;
      }

      // Récupérer les détails de l'organisation
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, plan, max_vehicles, max_users")
        .eq("id", profile.current_organization_id)
        .single();

      if (org) {
        setOrganization(org);
      }

      // Récupérer l'abonnement
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id")
        .eq("organization_id", profile.current_organization_id)
        .single();

      if (sub) {
        setSubscription(sub);
      }
    } catch (error) {
      console.error("[Billing] Error:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      if (!organization) return;

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          organizationId: organization.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création de la session");
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("[Billing] Upgrade error:", error);
      toast.error(error.message || "Erreur lors de la mise à niveau");
    }
  };

  const handleManageSubscription = async () => {
    try {
      if (!organization) return;

      setIsPortalLoading(true);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'accès au portail");
      }

      // Rediriger vers le portail Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("[Billing] Portal error:", error);
      toast.error(error.message || "Erreur lors de l'accès au portail");
    } finally {
      setIsPortalLoading(false);
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      past_due: "destructive",
      canceled: "outline",
      unpaid: "destructive",
      incomplete: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {SUBSCRIPTION_STATUS_LABELS[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlan = PLANS[organization?.plan || "free"];
  const isPaid = organization?.plan !== "free";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Abonnement</h1>
        <p className="text-slate-500 mt-1">
          Gérez votre abonnement et vos paiements
        </p>
      </div>

      {/* Résumé de l'abonnement actuel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Nom</span>
            <span className="font-medium">{organization?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Plan actuel</span>
            <div className="flex items-center gap-2">
              <Badge variant={isPaid ? "default" : "secondary"}>
                {currentPlan?.name || organization?.plan}
              </Badge>
              {subscription && getStatusBadge(subscription.status)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Véhicules</span>
            <span className="font-medium">
              {organization?.max_vehicles === -1 ? "Illimités" : `Jusqu'à ${organization?.max_vehicles}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Utilisateurs</span>
            <span className="font-medium">
              {organization?.max_users === -1 ? "Illimités" : `Jusqu'à ${organization?.max_users}`}
            </span>
          </div>
          {subscription?.current_period_end && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Prochaine facturation</span>
              <span className="font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
              </span>
            </div>
          )}
          {subscription?.cancel_at_period_end && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">
                Votre abonnement sera annulé à la fin de la période en cours.
              </span>
            </div>
          )}
        </CardContent>
        {isPaid && (
          <CardFooter>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Gérer l'abonnement
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Plans disponibles */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Plans disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan) => {
            const isCurrentPlan = organization?.plan === plan.id;
            const isPopular = plan.id === "pro";

            return (
              <Card
                key={plan.id}
                className={`relative ${isCurrentPlan ? "border-blue-500 ring-1 ring-blue-500" : ""} ${
                  isPopular ? "shadow-lg" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600">Plus populaire</Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <Badge variant="outline" className="bg-white">
                      <Check className="w-3 h-3 mr-1" />
                      Actuel
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-3xl font-bold">
                    {plan.price === 0 ? (
                      "Gratuit"
                    ) : (
                      <>
                        {plan.price}€
                        <span className="text-base font-normal text-slate-500">/mois</span>
                      </>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {plan.limits.vehicles === -1
                        ? "Véhicules illimités"
                        : `Jusqu'à ${plan.limits.vehicles} véhicules`}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {plan.limits.users === -1
                        ? "Utilisateurs illimités"
                        : `Jusqu'à ${plan.limits.users} utilisateurs`}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" disabled>
                      Plan actuel
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => toast.info("Contactez-nous pour passer au plan gratuit")}
                    >
                      Contacter
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {organization?.plan === "free" ? "Commencer" : "Mettre à niveau"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Informations de facturation */}
      {isPaid && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historique de facturation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500 text-sm">
              Votre historique de facturation est disponible dans le{" "}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={handleManageSubscription}
                disabled={isPortalLoading}
              >
                portail client Stripe
              </Button>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
