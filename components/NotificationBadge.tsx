"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface NotificationCounts {
  pendingQuotes: number;
  criticalVehicles: number;
}

export function useNotificationCounts() {
  const [counts, setCounts] = useState<NotificationCounts>({
    pendingQuotes: 0,
    criticalVehicles: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchCounts = async () => {
    try {
      // Count pending interventions (devis à valider)
      const { count: pendingQuotes, error: error1 } = await supabase
        .from("interventions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error1) {
        console.error("[NotificationBadge] Error fetching pending:", error1);
      }

      // Count critical vehicles (CT/Tachy dans moins de 7 jours ou périmé)
      const today = new Date().toISOString().split("T")[0];
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const { count: criticalVehicles, error: error2 } = await supabase
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .or(`date_ct.lte.${sevenDaysLater},date_tachy.lte.${sevenDaysLater}`);

      if (error2) {
        console.error("[NotificationBadge] Error fetching critical:", error2);
      }

      setCounts({
        pendingQuotes: pendingQuotes || 0,
        criticalVehicles: criticalVehicles || 0,
      });
    } catch (err) {
      console.error("[NotificationBadge] Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();

    // Refresh every 2 minutes
    const interval = setInterval(fetchCounts, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { counts, loading, refresh: fetchCounts };
}

export function PendingQuotesBadge() {
  const { counts, loading } = useNotificationCounts();

  if (loading || counts.pendingQuotes === 0) {
    return null;
  }

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
      {counts.pendingQuotes > 99 ? "99+" : counts.pendingQuotes}
    </span>
  );
}

export function CriticalVehiclesBadge() {
  const { counts, loading } = useNotificationCounts();

  if (loading || counts.criticalVehicles === 0) {
    return null;
  }

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
      {counts.criticalVehicles > 99 ? "99+" : counts.criticalVehicles}
    </span>
  );
}

/**
 * Badge pour les défauts d'inspection ouverts
 */
export function OpenDefectsBadge() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOpenDefects = async () => {
      try {
        const { count, error } = await supabase
          .from("vehicle_inspections")
          .select("*", { count: "exact", head: true })
          .eq("status", "requires_action");

        if (!error) {
          setCount(count || 0);
        }
      } catch (err) {
        console.error("[OpenDefectsBadge] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpenDefects();

    // Refresh every 2 minutes
    const interval = setInterval(fetchOpenDefects, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || count === 0) {
    return null;
  }

  return (
    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
