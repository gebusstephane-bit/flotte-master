"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

interface PWAContextValue {
  isOffline: boolean;
  canInstall: boolean;
  installPWA: () => Promise<void>;
}

const PWAContext = createContext<PWAContextValue>({
  isOffline: false,
  canInstall: false,
  installPWA: async () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Détection offline/online
    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("Vous êtes hors ligne", {
        icon: <WifiOff className="w-4 h-4" />,
        description: "Certaines fonctionnalités peuvent être limitées",
        duration: 5000,
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Connexion rétablie", {
        icon: <Wifi className="w-4 h-4" />,
        duration: 3000,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    // État initial
    setIsOffline(!navigator.onLine);

    // Enregistrement du Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] SW enregistré:", registration.scope);
        })
        .catch((error) => {
          console.error("[PWA] Erreur SW:", error);
        });
    }

    // Détection install PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast.success("FleetFlow installé !");
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider value={{ isOffline, canInstall, installPWA }}>
      {children}
      {/* Indicateur hors ligne persistant */}
      {isOffline && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Hors ligne</span>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}
