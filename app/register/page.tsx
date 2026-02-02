"use client";

/**
 * PAGE D'INSCRIPTION - FleetFlow
 * Inscription avec choix de plan
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Truck, 
  Zap, 
  Building2, 
  ArrowRight, 
  Loader2,
  Mail,
  User,
  Building,
  MessageSquare,
  Phone
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type PlanType = "starter" | "pro" | "enterprise" | null;

interface Plan {
  id: PlanType;
  name: string;
  price: string;
  description: string;
  features: string[];
  color: string;
  icon: React.ElementType;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "29€",
    description: "Parfait pour démarrer",
    features: [
      "Jusqu'à 10 véhicules",
      "3 utilisateurs",
      "Support email",
      "14 jours d'essai",
    ],
    color: "from-blue-500 to-cyan-500",
    icon: Truck,
  },
  {
    id: "pro",
    name: "Pro",
    price: "79€",
    description: "Pour les flottes en croissance",
    features: [
      "Jusqu'à 50 véhicules",
      "10 utilisateurs",
      "Support prioritaire",
      "14 jours d'essai",
    ],
    color: "from-purple-500 to-pink-500",
    icon: Zap,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur mesure",
    description: "Pour les grandes organisations",
    features: [
      "Véhicules illimités",
      "Utilisateurs illimités",
      "Support dédié 24/7",
      "Personnalisation",
    ],
    color: "from-amber-500 to-orange-500",
    icon: Building2,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Logo size="md" />
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-slate-600">Déjà inscrit ?</span>
              <Link 
                href="/login"
                className="text-[#0066FF] font-medium hover:underline"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!selectedPlan ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">
                Choisissez votre formule
              </h1>
              <p className="text-lg text-slate-600">
                Commencez gratuitement pendant 14 jours. Sans engagement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <button
                    onClick={() => setSelectedPlan(plan.id)}
                    className="w-full h-full text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-[#0066FF] hover:shadow-xl hover:shadow-blue-500/10 transition-all p-8 group"
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <plan.icon className="w-7 h-7 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-slate-500 mb-4">{plan.description}</p>
                    
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-slate-900">
                        {plan.price}
                      </span>
                      {plan.price !== "Sur mesure" && (
                        <span className="text-slate-500">/mois</span>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#00D4AA] flex-shrink-0" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors ${
                      plan.id === "enterprise"
                        ? "bg-slate-900 text-white group-hover:bg-slate-800"
                        : "bg-[#0066FF] text-white group-hover:bg-[#0052CC]"
                    }`}>
                      {plan.id === "enterprise" ? "Nous contacter" : "Commencer l'essai"}
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            <p className="text-center text-slate-500 mt-8">
              Besoin d'aide pour choisir ?{" "}
              <a href="mailto:fleet.master.contact@gmail.com" className="text-[#0066FF] hover:underline">
                Contactez-nous
              </a>
            </p>
          </motion.div>
        ) : selectedPlan === "enterprise" ? (
          <EnterpriseForm onBack={() => setSelectedPlan(null)} />
        ) : (
          <RegisterForm plan={selectedPlan} onBack={() => setSelectedPlan(null)} />
        )}
      </main>
    </div>
  );
}

// Formulaire d'inscription Starter/Pro
function RegisterForm({ plan, onBack }: { plan: "starter" | "pro"; onBack: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // 1. Créer le compte Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            company_name: formData.companyName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            plan: plan,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Vérifier si la confirmation d'email est requise
        if (authData.session) {
          // Connexion immédiate (confirmation désactivée côté Supabase)
          toast.success("Compte créé avec succès !");
          router.push("/dashboard");
          router.refresh();
        } else {
          // Email de confirmation envoyé
          setSuccess(true);
          toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
        }
      }
    } catch (error: any) {
      console.error("[Register] Error:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  // Afficher le message de succès après inscription
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto text-center"
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Compte créé avec succès !
          </h2>
          <p className="text-slate-600 mb-4">
            Un email de confirmation a été envoyé à <strong>{formData.email}</strong>.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Cliquez sur le lien dans l&apos;email pour activer votre compte, puis connectez-vous.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-[#0066FF] text-white font-semibold rounded-lg hover:bg-[#0052CC] transition-colors"
            >
              Aller à la connexion
            </Link>
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-900"
            >
              ← Retour aux formules
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-xl mx-auto"
    >
      <button
        onClick={onBack}
        className="text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-2"
      >
        ← Retour aux formules
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
            plan === "starter" 
              ? "bg-blue-100 text-blue-700" 
              : "bg-purple-100 text-purple-700"
          }`}>
            Formule {plan === "starter" ? "Starter" : "Pro"}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Créer votre compte
          </h2>
          <p className="text-slate-600 mt-2">
            14 jours d'essai gratuit. Sans engagement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nom de l'entreprise
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="Mon Entreprise SAS"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Prénom
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                  placeholder="Jean"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email professionnel
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="jean.dupont@entreprise.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
              placeholder="••••••••"
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#0066FF] text-white font-semibold rounded-lg hover:bg-[#0052CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Création du compte...
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          En créant un compte, vous acceptez nos{" "}
          <Link href="#" className="text-[#0066FF] hover:underline">CGU</Link>
          {" "}et notre{" "}
          <Link href="#" className="text-[#0066FF] hover:underline">politique de confidentialité</Link>.
        </p>
      </div>
    </motion.div>
  );
}

// Formulaire de contact Enterprise
function EnterpriseForm({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    fleetSize: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Envoyer l'email via l'API
      const response = await fetch("/api/contact-enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          to: "fleet.master.contact@gmail.com",
        }),
      });

      if (!response.ok) throw new Error("Erreur lors de l'envoi");

      setSent(true);
      toast.success("Votre demande a été envoyée !");
    } catch (error) {
      console.error("[Contact Enterprise] Error:", error);
      toast.error("Erreur lors de l'envoi. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto text-center"
      >
        <div className="bg-white rounded-2xl border border-slate-200 p-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Demande envoyée !
          </h2>
          <p className="text-slate-600 mb-8">
            Notre équipe commerciale vous contactera dans les plus brefs délais
            à l&apos;adresse <strong>{formData.email}</strong>.
          </p>
          <button
            onClick={onBack}
            className="text-[#0066FF] font-medium hover:underline"
          >
            ← Retour aux formules
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="max-w-xl mx-auto"
    >
      <button
        onClick={onBack}
        className="text-slate-500 hover:text-slate-900 mb-6 flex items-center gap-2"
      >
        ← Retour aux formules
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 bg-amber-100 text-amber-700">
            Formule Enterprise
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Contactez-nous
          </h2>
          <p className="text-slate-600 mt-2">
            Décrivez-nous vos besoins et nous vous recontacterons sous 24h.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nom de l'entreprise *
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="Mon Entreprise SAS"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email professionnel *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="jean.dupont@entreprise.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Téléphone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Taille de la flotte
            </label>
            <select
              value={formData.fleetSize}
              onChange={(e) => setFormData({ ...formData, fleetSize: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all"
            >
              <option value="">Sélectionnez...</option>
              <option value="50-100">50 à 100 véhicules</option>
              <option value="100-250">100 à 250 véhicules</option>
              <option value="250-500">250 à 500 véhicules</option>
              <option value="500+">Plus de 500 véhicules</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Votre message
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none transition-all resize-none"
                placeholder="Décrivez vos besoins spécifiques..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                Envoyer ma demande
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Vous pouvez aussi nous contacter directement à{" "}
          <a href="mailto:fleet.master.contact@gmail.com" className="text-[#0066FF] hover:underline">
            fleet.master.contact@gmail.com
          </a>
        </p>
      </div>
    </motion.div>
  );
}
