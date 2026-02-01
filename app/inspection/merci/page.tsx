"use client";

/**
 * PAGE PUBLIQUE - Confirmation après inspection
 * 
 * Affiché après soumission réussie d'une inspection anonyme.
 * Message de remerciement simple, pas de redirection vers le dashboard.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Shield, Timer, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function MerciPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="p-8 text-center">
          {/* Icône succès animée */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-green-400 rounded-full mx-auto animate-ping opacity-20" />
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Merci !
          </h1>
          
          <p className="text-slate-600 mb-6">
            Votre inspection a été enregistrée avec succès.
            Elle sera examinée par notre équipe technique.
          </p>

          {/* Informations */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <span>Inspection sécurisée et enregistrée</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <Timer className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Examen sous 24h ouvrées</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>En cas d&apos;anomalie critique, le véhicule sera immobilisé</span>
            </div>
          </div>

          {/* Bouton nouvelle inspection */}
          <Button 
            onClick={() => router.push("/inspection")}
            className="w-full h-12 bg-green-600 hover:bg-green-700"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Nouvelle inspection
          </Button>

          <p className="text-xs text-slate-400 mt-4">
            Vous pouvez effectuer une autre inspection
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>FleetFlow Inspection System</p>
      </div>
    </div>
  );
}
