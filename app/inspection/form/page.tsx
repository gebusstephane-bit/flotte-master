"use client";

/**
 * Formulaire d'inspection - Étape finale
 * Affiche le formulaire complet après sélection du véhicule
 */

import { Suspense } from "react";
import { InspectionForm } from "@/components/inspection/InspectionForm";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function InspectionFormPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Suspense 
        fallback={
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-500">Chargement du formulaire...</p>
            </CardContent>
          </Card>
        }
      >
        <InspectionForm />
      </Suspense>
    </div>
  );
}
