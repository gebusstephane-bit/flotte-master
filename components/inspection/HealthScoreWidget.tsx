"use client";

/**
 * Health Score Widget - Module Vehicle Inspection
 * Widget Dashboard affichant le score santé du parc
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInspectionSummaries, getInspectionStats } from "@/lib/inspection/actions";
import {
  HEALTH_COLORS,
  type VehicleInspectionSummary,
  type InspectionStats,
} from "@/lib/inspection/types";

export function HealthScoreWidget() {
  const [summaries, setSummaries] = useState<VehicleInspectionSummary[]>([]);
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [summariesResult, statsResult] = await Promise.all([
      getInspectionSummaries(),
      getInspectionStats(),
    ]);

    if (summariesResult.success) {
      setSummaries(summariesResult.data);
    }
    if (statsResult.success) {
      setStats(statsResult.data);
    }
    setLoading(false);
  };

  // Calculs
  const averageHealthScore = summaries.length > 0
    ? Math.round(summaries.reduce((acc, s) => acc + s.health_score, 0) / summaries.length)
    : 0;

  const vehiclesInDanger = summaries.filter((s) => s.health_status === "danger").length;
  const vehiclesWarning = summaries.filter((s) => s.health_status === "warning").length;
  const inspectionOverdue = summaries.filter((s) => s.inspection_overdue).length;

  // Score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 50) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="h-8 bg-slate-200 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Santé du Parc
        </CardTitle>
        <Link href="/inspection">
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </CardHeader>
      <CardContent>
        {/* Score principal */}
        <div className="flex items-end gap-2 mb-4">
          <span className={`text-4xl font-bold ${getScoreColor(averageHealthScore)}`}>
            {averageHealthScore}
          </span>
          <span className="text-slate-400 mb-1">/100</span>
        </div>

        {/* Barre de progression */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all duration-500 ${getScoreBg(averageHealthScore)}`}
            style={{ width: `${averageHealthScore}%` }}
          />
        </div>

        {/* Alertes */}
        <div className="space-y-2 mb-4">
          {vehiclesInDanger > 0 && (
            <Link href="/inspection/review">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">Véhicules critiques</span>
                </div>
                <Badge variant="destructive">{vehiclesInDanger}</Badge>
              </div>
            </Link>
          )}

          {vehiclesWarning > 0 && (
            <Link href="/inspection/review">
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm text-orange-700">Avertissements</span>
                </div>
                <Badge className="bg-orange-500">{vehiclesWarning}</Badge>
              </div>
            </Link>
          )}

          {inspectionOverdue > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">Inspections en retard</span>
              </div>
              <Badge className="bg-yellow-500">{inspectionOverdue}</Badge>
            </div>
          )}

          {vehiclesInDanger === 0 && vehiclesWarning === 0 && inspectionOverdue === 0 && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Tous les véhicules sont en bon état</span>
            </div>
          )}
        </div>

        {/* Stats rapides */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.totalInspections}</p>
              <p className="text-xs text-slate-500">Total inspections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.inspectionsToday}</p>
              <p className="text-xs text-slate-500">Aujourd&apos;hui</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href="/inspection">Nouvelle inspection</Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href="/inspection/review">Réviser</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mini Health Indicator pour les listes de véhicules
 */
export function HealthIndicator({ score, status }: { score: number; status: string }) {
  const getColor = () => {
    switch (status) {
      case "good": return "bg-green-500";
      case "minor": return "bg-yellow-400";
      case "warning": return "bg-orange-500";
      case "danger": return "bg-red-500";
      default: return "bg-slate-300";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getColor()}`} />
      <span className="text-xs font-medium">{score}</span>
    </div>
  );
}

/**
 * Badge de défauts pour les listes
 */
export function DefectBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
      <AlertTriangle className="w-3 h-3 mr-1" />
      {count} défaut{count > 1 ? "s" : ""}
    </Badge>
  );
}
