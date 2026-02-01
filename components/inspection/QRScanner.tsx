"use client";

/**
 * QR Scanner Component - Module Vehicle Inspection
 * Scan QR code pour identifier un véhicule
 * Fallback: Saisie manuelle immatriculation
 */

import { useState, useRef, useCallback } from "react";
import { Camera, Keyboard, Scan, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { searchVehicleByImmat, getVehicleById } from "@/lib/inspection/actions";
import type { QRScanResult } from "@/lib/inspection/types";

interface QRScannerProps {
  onScan: (result: QRScanResult) => void;
  onError?: (error: string) => void;
}

type ScanMode = "camera" | "manual";

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [mode, setMode] = useState<ScanMode>("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; immat: string; marque: string; type: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Démarrer le scan caméra
  const startCamera = useCallback(async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasCamera(false);
      setMode("manual");
      onError?.("Impossible d'accéder à la caméra. Utilisez la saisie manuelle.");
    }
  }, [onError]);

  // Arrêter le scan caméra
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Simuler un scan QR (dans une vraie implémentation, utiliser jsQR ou html5-qrcode)
  const simulateQRScan = useCallback(async () => {
    // Dans une implémentation réelle, on utiliserait une bibliothèque comme:
    // - html5-qrcode
    // - @zxing/library
    // - jsQR
    
    // Pour cette démo, on simule la détection d'un QR code
    // Le QR code contiendrait l'UUID du véhicule
    
    // Exemple: arrêter la caméra et demander l'ID manuellement
    stopCamera();
    
    // Ici on pourrait intégrer html5-qrcode
    // Pour l'instant, on bascule en mode manuel
    setMode("manual");
  }, [stopCamera]);

  // Recherche par immatriculation
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await searchVehicleByImmat(searchQuery);
      if (result.success) {
        setSearchResults(result.data);
        if (result.data.length === 0) {
          onError?.("Aucun véhicule trouvé");
        }
      } else {
        onError?.(result.error);
      }
    } catch (err) {
      onError?.("Erreur de recherche");
    } finally {
      setIsSearching(false);
    }
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

  // Charger un véhicule par ID (pour QR)
  const loadVehicleById = useCallback(async (id: string) => {
    const result = await getVehicleById(id);
    if (result.success) {
      selectVehicle(result.data);
    } else {
      onError?.(result.error);
    }
  }, [onError, selectVehicle]);

  return (
    <div className="space-y-4">
      {/* Sélection du mode */}
      <div className="flex gap-2">
        <Button
          variant={mode === "camera" ? "default" : "outline"}
          className="flex-1"
          onClick={() => {
            setMode("camera");
            startCamera();
          }}
          disabled={!hasCamera}
        >
          <Camera className="w-4 h-4 mr-2" />
          Caméra
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "outline"}
          className="flex-1"
          onClick={() => {
            setMode("manual");
            stopCamera();
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay de scan */}
                  <div className="absolute inset-0 flex items-center justify-center">
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
                    onClick={stopCamera}
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
                  <Button className="mt-4" onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-2" />
                    Démarrer le scan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Note sur l'intégration QR */}
          <p className="text-xs text-slate-500 mt-2 text-center">
            💡 Pour une intégration QR complète, installer: npm install html5-qrcode
          </p>
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

// Hook pour la détection QR (à utiliser avec html5-qrcode)
export function useQRScanner(onScan: (result: string) => void) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);

  const startScanning = useCallback(async (elementId: string) => {
    try {
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import("html5-qrcode");
      
      scannerRef.current = new Html5Qrcode(elementId);
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Error callback - QR code not found yet
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      console.error("QR Scanner error:", err);
    }
  }, [onScan]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  return { isScanning, startScanning, stopScanning };
}
