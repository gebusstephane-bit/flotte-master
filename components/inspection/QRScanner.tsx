"use client";

/**
 * QR Scanner Component - Module Vehicle Inspection
 * Scan QR code avec html5-qrcode pour identifier un véhicule
 * Fallback: Saisie manuelle immatriculation
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Keyboard, Scan, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { searchVehicleByImmatAPI, getVehicleByIdAPI } from "@/lib/inspection/public-api";
import { searchVehicleByImmatDirect, getVehicleByIdDirect } from "@/lib/inspection/public-direct";
import type { QRScanResult } from "@/lib/inspection/types";

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  onError?: (error: string) => void;
}

type ScanMode = "camera" | "manual";

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; immat: string; marque: string; type: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Arrêter le scanner proprement
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Démarrer le scan QR avec html5-qrcode
  const startQRScanner = useCallback(async () => {
    if (!qrContainerRef.current) return;
    
    try {
      setIsScanning(true);
      
      // Import dynamique de html5-qrcode
      const { Html5Qrcode } = await import("html5-qrcode");
      
      scannerRef.current = new Html5Qrcode(qrContainerRef.current.id);
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText: string) => {
          // QR Code détecté!
          console.log("[QRScanner] QR Code détecté:", decodedText);
          
          // Arrêter le scanner
          await stopScanner();
          
          // Essayer de charger le véhicule par ID
          let result;
          try {
            result = await getVehicleByIdAPI(decodedText);
            if (!result.success) throw new Error(result.error);
          } catch (err) {
            try {
              result = await getVehicleByIdDirect(decodedText);
            } catch (directErr: any) {
              onError?.("Erreur: " + directErr.message);
              return;
            }
          }
          
          if (result.success) {
            onScan({
              vehicle_id: result.data.id,
              immat: result.data.immat,
              marque: result.data.marque,
              type: result.data.type,
            });
          } else {
            onError?.("Véhicule non trouvé");
          }
        },
        () => {
          // QR code not found yet - ignorer silencieusement
        }
      );
    } catch (err: any) {
      console.error("[QRScanner] Erreur démarrage:", err);
      setHasCamera(false);
      setMode("manual");
      onError?.("Caméra indisponible. Utilisez la saisie manuelle.");
    }
  }, [onScan, onError, stopScanner]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Recherche par immatriculation avec fallback
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    let result;
    
    // Essai 1: API
    try {
      result = await searchVehicleByImmatAPI(searchQuery);
      if (!result.success) throw new Error(result.error);
    } catch (err) {
      // Essai 2: Direct
      try {
        result = await searchVehicleByImmatDirect(searchQuery);
      } catch (directErr: any) {
        onError?.("Erreur de connexion: " + directErr.message);
        setIsSearching(false);
        return;
      }
    }
    
    if (result.success) {
      setSearchResults(result.data);
      if (result.data.length === 0) {
        onError?.("Aucun véhicule trouvé");
      }
    } else {
      onError?.(result.error);
    }
    setIsSearching(false);
  }, [searchQuery, onError]);

  // Sélectionner un véhicule
  const selectVehicle = useCallback((vehicle: { id: string; immat: string; marque: string; type: string }) => {
    onScan({
      vehicle_id: vehicle.id,
      immat: vehicle.immat,
      marque: vehicle.marque,
      type: vehicle.type,
    });
  }, [onScan]);

  return (
    <div className="space-y-4">
      {/* Sélection du mode */}
      <div className="flex gap-2">
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          className="flex-1"
          onClick={() => {
            setMode("camera");
            startQRScanner();
          }}
          disabled={!hasCamera || isScanning}
        >
          <Camera className="w-4 h-4 mr-2" />
          {isScanning ? "Scan en cours..." : "Caméra"}
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          className="flex-1"
          onClick={() => {
            setMode("manual");
            stopScanner();
          }}
        >
          <Keyboard className="w-4 h-4 mr-2" />
          Manuel
        </Button>
      </div>

      {/* Mode Caméra */}
      {mode === "camera" && (
        <div className="relative">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {isScanning ? (
                <div className="relative aspect-square bg-black">
                  {/* Container pour html5-qrcode */}
                  <div 
                    id="qr-reader-container" 
                    ref={qrContainerRef}
                    className="w-full h-full"
                  />
                  {/* Overlay de scan */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1" />
                    </div>
                  </div>
                  {/* Bouton fermer */}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={stopScanner}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="aspect-square flex flex-col items-center justify-center bg-slate-100 p-6">
                  <Scan className="w-16 h-16 text-slate-400 mb-4" />
                  <p className="text-slate-600 text-center">
                    Positionnez le QR code du véhicule dans le cadre
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={startQRScanner}
                    disabled={!hasCamera}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Démarrer le scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mode Manuel */}
      {mode === "manual" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Immatriculation (ex: AB-123-CD)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                {searchResults.length} véhicule(s) trouvé(s):
              </p>
              {searchResults.map((vehicle) => (
                <Card
                  key={vehicle.id}
                  className="cursor-pointer hover:border-blue-500 transition-colors"
                  onClick={() => selectVehicle(vehicle)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono font-bold text-lg text-blue-600">
                          {vehicle.immat}
                        </p>
                        <p className="text-sm text-slate-600">{vehicle.marque}</p>
                        <p className="text-xs text-slate-500">{vehicle.type}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Sélectionner →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <p className="text-sm text-slate-500 text-center">
              Aucun résultat. Essayez une autre recherche.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
