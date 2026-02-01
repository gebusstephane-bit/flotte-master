"use client";

/**
 * Système de notifications temps réel
 * Affiche les alertes quand un nouveau contrôle critique est soumis
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Eye, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface NotificationPayload {
  id: string;
  vehicle_id: string;
  vehicle_immat: string;
  vehicle_marque: string;
  health_score: number;
  critical_defects: number;
  inspector_name: string;
}

export function RealTimeNotifications() {
  useEffect(() => {
    // Souscription aux changements de la table vehicle_inspections
    const channel = supabase
      .channel("inspection-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vehicle_inspections",
        },
        async (payload) => {
          console.log("Nouvelle inspection:", payload);
          
          // Récupérer les détails du véhicule
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("immat, marque")
            .eq("id", payload.new.vehicle_id)
            .single();
          
          const defects = payload.new.defects || [];
          const criticalCount = defects.filter((d: any) => d.severity === "critical").length;
          const healthScore = calculateHealthScore(defects);
          
          const notificationData: NotificationPayload = {
            id: payload.new.id,
            vehicle_id: payload.new.vehicle_id,
            vehicle_immat: vehicle?.immat || "N/A",
            vehicle_marque: vehicle?.marque || "N/A",
            health_score: healthScore,
            critical_defects: criticalCount,
            inspector_name: payload.new.inspector_name,
          };
          
          // Si c'est critique, afficher une notification urgente
          if (criticalCount > 0 || healthScore < 50) {
            showCriticalNotification(notificationData);
          } else if (healthScore < 80) {
            showWarningNotification(notificationData);
          }
        }
      )
      .subscribe((status) => {
        console.log("Status subscription notifications:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const showCriticalNotification = (data: NotificationPayload) => {
    toast.error(
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-bold text-red-700">
          <AlertTriangle className="w-5 h-5" />
          ALERTE CRITIQUE - Inspection véhicule
        </div>
        <div className="text-sm">
          <p className="font-semibold">{data.vehicle_immat} - {data.vehicle_marque}</p>
          <p className="text-slate-600">
            Score: <span className="font-bold text-red-600">{data.health_score}/100</span>
            {" "}• {data.critical_defects} anomalie(s) critique(s)
          </p>
          <p className="text-xs text-slate-500">
            Par: {data.inspector_name || "Inconnu"}
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="destructive" asChild>
            <Link href={`/inspections/${data.id}`}>
              <Eye className="w-4 h-4 mr-1" />
              Voir détail
            </Link>
          </Button>
        </div>
      </div>,
      {
        duration: 10000, // 10 secondes
      }
    );
  };

  const showWarningNotification = (data: NotificationPayload) => {
    toast.warning(
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-700">
          <Bell className="w-5 h-5" />
          Nouvelle inspection - Attention requise
        </div>
        <div className="text-sm">
          <p className="font-semibold">{data.vehicle_immat} - {data.vehicle_marque}</p>
          <p className="text-slate-600">
            Score: <span className="font-bold text-amber-600">{data.health_score}/100</span>
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/inspections/${data.id}`}>
            <Eye className="w-4 h-4 mr-1" />
            Consulter
          </Link>
        </Button>
      </div>,
      {
        duration: 8000,
      }
    );
  };

  // Ce composant ne rend rien de visible, il gère juste les notifications
  return null;
}

// Composant pour afficher le statut de la connexion (optionnel, pour debug)
export function NotificationStatus() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("inspection-notifications-status")
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 text-xs ${isSubscribed ? "text-green-600" : "text-slate-400"}`}>
      <div className={`w-2 h-2 rounded-full ${isSubscribed ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
      {isSubscribed ? "Notifications actives" : "Notifications hors ligne"}
    </div>
  );
}

function calculateHealthScore(defects: any[]): number {
  if (!defects || defects.length === 0) return 100;
  
  let penalty = 0;
  defects.forEach((defect) => {
    switch (defect.severity) {
      case "critical":
        penalty += 30;
        break;
      case "warning":
        penalty += 10;
        break;
      case "minor":
        penalty += 2;
        break;
    }
  });
  
  return Math.max(0, 100 - penalty);
}
