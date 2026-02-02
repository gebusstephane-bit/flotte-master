"use client";

/**
 * Login Page - FleetFlow 2.0
 * Design modernisé avec nouveaux composants unifiés
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonUnified } from "@/components/ui/button-unified";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0066FF]/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#00D4AA]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Logo animé */}
        <motion.div 
          className="mb-10 flex justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo size="lg" variant="dark" animated />
        </motion.div>

        {/* Form card */}
        <motion.div 
          className="bg-white rounded-2xl shadow-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
            <p className="text-slate-500 text-sm mt-1">
              Accédez à votre espace de gestion de flotte
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400
                    focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 outline-none transition-all"
                  placeholder="nom@entreprise.com"
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400
                    focus:bg-white focus:border-[#0066FF] focus:ring-4 focus:ring-[#0066FF]/10 outline-none transition-all"
                  placeholder="Votre mot de passe"
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <motion.div 
                className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            {/* Submit button */}
            <ButtonUnified
              type="submit"
              variant="primary"
              isFullWidth
              size="lg"
              isLoading={loading}
              loadingText="Connexion..."
            >
              Se connecter
            </ButtonUnified>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-6">
            © 2026 FleetFlow. Tous droits réservés.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
