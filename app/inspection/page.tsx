"use client";

/**
 * PAGE PUBLIQUE - Landing Inspection Conducteur
 * 
 * Accès anonyme pour les conducteurs sur le terrain.
 * Pas besoin de compte, pas de navbar admin, interface mobile-first.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Keyboard, Search, ArrowRight, Truck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { QRScanner } from "@/components/inspection/QRScanner";
import { searchVehicleByImmatAPI } from "@/lib/inspection/public-api";
import type { QRScanResult } from "@/lib/inspection/types";

export default function PublicInspectionLanding() {
  const router = useRouter();
  const [mode, setMode] = useState<"choice" | "qr" | "manual">("choice");
  const [immat, setImmat] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Gestion du scan QR réussi
  const handleQRScan = (result: QRScanResult) => {
    toast.success("Véhicule trouvé !");
    // Redirection vers le formulaire d'inspection
    router.push(`/inspection/${result.vehicle_id}`);
  };

  // Recherche par plaque
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchTerm = immat.trim().toUpperCase();
    console.log("[DEBUG] Recherche plaque:", searchTerm);
    
    if (!searchTerm || searchTerm.length < 2) {
      toast.error("Veuillez saisir une immatriculation valide (min 2 caractères)");
      return;
    }

    setIsSearching(true);
    
    try {
      const result = await searchVehicleByImmatAPI(searchTerm);
      console.log("[DEBUG] Résultat recherche:", result);
      
      if (!result.success) {
        toast.error(result.error || "Erreur lors de la recherche");
        return;
      }

      if (!result.data || result.data.length === 0) {
        toast.error(`Aucun véhicule trouvé avec "${searchTerm}"`);
        return;
      }

      if (result.data.length === 1) {
        // Un seul résultat : redirection directe
        const vehicle = result.data[0];
        console.log("[DEBUG] Redirection vers:", `/inspection/${vehicle.id}`, "ID:", vehicle.id, "Type:", typeof vehicle.id);
        toast.success(`Véhicule ${vehicle.immat} trouvé !`);
        router.push(`/inspection/${vehicle.id}`);
      } else {
        // Multiple résultats : afficher la liste
        const vehicle = result.data[0];
        console.log("[DEBUG] Redirection vers:", `/inspection/${vehicle.id}`, "ID:", vehicle.id);
        toast.success(`${result.data.length} véhicules trouvés`);
        router.push(`/inspection/${vehicle.id}`);
      }
    } catch (error) {
      console.error("[DEBUG] Erreur recherche:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  // Mode choix initial
  if (mode === "choice") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
        {/* Header minimal */}
        <header className="bg-white shadow-sm py-4 px-4">
          <div className="max-w-md mx-auto flex items-center justify-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-bold text-slate-800">FleetFlow Inspection</h1>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Inspection véhicule
              </h2>
              <p className="text-slate-600">
                Choisissez comment identifier le véhicule
              </p>
            </div>

            <div className="grid gap-4">
              {/* Option QR Code */}
              <Card 
                className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all"
                onClick={() => setMode("qr")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Scanner le QR Code</h3>
                    <p className="text-sm text-slate-500">Scan rapide avec l'appareil photo</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>

              {/* Option Plaque */}
              <Card 
                className="cursor-pointer hover:border-green-500 hover:shadow-md transition-all"
                onClick={() => setMode("manual")}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Keyboard className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">Saisir la plaque</h3>
                    <p className="text-sm text-slate-500">Entrez l'immatriculation manuellement</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </CardContent>
              </Card>
            </div>

            {/* Info bas de page */}
            <div className="text-center text-sm text-slate-400 pt-4">
              <p>Pour les conducteurs · Accès sans compte</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Mode Scan QR
  if (mode === "qr") {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-sm py-4 px-4 absolute top-0 left-0 right-0 z-10">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button 
              onClick={() => setMode("choice")}
              className="text-white/80 hover:text-white flex items-center gap-1 text-sm"
            >
              ← Retour
            </button>
            <span className="text-white font-medium">Scanner QR Code</span>
            <div className="w-12" />{/* Spacer */}
          </div>
        </header>

        {/* Scanner */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <QRScanner onScan={handleQRScan} />
        </div>

        {/* Instructions */}
        <div className="bg-black/80 backdrop-blur-sm p-6 text-center">
          <p className="text-white/80 text-sm">
            Positionnez le QR code du véhicule dans le cadre
          </p>
        </div>
      </div>
    );
  }

  // Mode Manuel (saisie plaque)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={() => setMode("choice")}
            className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-sm"
          >
            ← Retour
          </button>
          <span className="font-medium text-slate-900">Saisie manuelle</span>
          <div className="w-12" />{/* Spacer */}
        </div>
      </header>

      {/* Formulaire */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Rechercher un véhicule
            </h2>
            <p className="text-slate-600">
              Saisissez l'immatriculation complète
            </p>
          </div>

          <form onSubmit={handleManualSearch} className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="AB-123-CD"
                value={immat}
                onChange={(e) => setImmat(e.target.value.toUpperCase())}
                className="text-center text-lg font-mono uppercase h-14 tracking-wider"
                maxLength={20}
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg"
              disabled={isSearching || immat.trim().length < 2}
            >
              {isSearching ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Rechercher
                </>
              )}
            </Button>
          </form>

          {/* Exemples */}
          <div className="text-center text-sm text-slate-400 pt-4">
            <p>Exemples: AB-123-CD, 1234-AB-75, AA-123-BB</p>
          </div>
        </div>
      </main>
    </div>
  );
}
