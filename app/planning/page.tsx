"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase, type Intervention } from "@/lib/supabase";
import { Separator } from "@/components/ui/separator";
import { Calendar, Timer, Truck, Wrench, MapPin, Building2, Euro, RefreshCw, Loader2, Hash, FileDown, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView, type CalendarEvent } from "@/components/CalendarView";
import { format, parseISO, isBefore, addDays, startOfMonth } from "date-fns";
import { useMemo } from "react";
import { fr } from "date-fns/locale";
import { RoleSwitcher, useRole } from "@/components/RoleSwitcher";
import { toast } from "sonner";
import { exportRepairsPdf } from "@/lib/pdf";

// Type etendu avec immat du vehicule
interface PlannedIntervention extends Intervention {
  vehicle?: { immat: string } | null;
}

// Fonction pour verifier si une intervention est imminente (< 7 jours)
function isImminente(rdvDate: string): boolean {
  const date = parseISO(rdvDate);
  const today = new Date();
  const in7Days = addDays(today, 7);
  return isBefore(date, in7Days);
}

export default function PlanningPage() {
  const { role, setRole } = useRole();

  const [interventions, setInterventions] = useState<PlannedIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<PlannedIntervention | null>(null);

  // Charger les interventions depuis Supabase
  const fetchInterventions = useCallback(async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Requete avec join sur vehicles pour avoir l'immat
     const { data, error } = await supabase
  .from("interventions")
  .select(`
    *,
    vehicle:vehicles!interventions_vehicle_fk ( immat )
  `)
  .eq("status", "planned")
  .not("rdv_date", "is", null)
  .order("rdv_date", { ascending: true });


      if (error) throw error;

      setInterventions(data || []);

      if (showRefreshToast) {
        toast.success("Liste actualisee");
      }
    } catch (error: any) {
      console.error("Erreur chargement interventions:", error);
      toast.error("Erreur de chargement", {
        description: error?.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchInterventions();
  }, [fetchInterventions]);

  // Statistiques
  const totalPlanned = interventions.length;
  const interventionsImminentes = interventions.filter((i) =>
    i.rdv_date ? isImminente(i.rdv_date) : false
  ).length;

  // Ouvrir detail
  const openDetail = (intervention: PlannedIntervention) => {
    setSelectedIntervention(intervention);
    setDetailOpen(true);
  };

  // Obtenir l'immat (depuis join ou champ immat)
 const getImmat = (intervention: PlannedIntervention): string => {
  return intervention.vehicle?.immat || intervention.immat || "N/A";
};

  // Convertir interventions en événements calendrier
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return interventions
      .filter((i) => i.rdv_date)
      .map((i) => ({
        id: i.id,
        title: `${i.vehicule || "Véhicule"} - ${i.description.slice(0, 20)}...`,
        date: i.rdv_date!,
        type: i.status === "planned" ? "rdv" : "intervention",
      }));
  }, [interventions]);

  // Gestion clic sur événement calendrier
  const handleCalendarEventClick = (event: CalendarEvent) => {
    const intervention = interventions.find((i) => i.id === event.id);
    if (intervention) {
      openDetail(intervention);
    }
  };


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Planning</h1>
          <p className="text-slate-600 mt-2">
            Interventions planifiees avec RDV confirme
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => fetchInterventions(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualiser
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                exportRepairsPdf(interventions, { title: "Planning — Interventions planifiées", filter: "RDV confirmés" });
                toast.success("PDF exporté");
              } catch (err: any) {
                console.error("[PDF]", err);
                toast.error("Erreur export PDF");
              }
            }}
            disabled={interventions.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          <RoleSwitcher onRoleChange={setRole} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalPlanned}
                </p>
                <p className="text-sm text-slate-600">RDV planifies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Timer className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {interventionsImminentes}
                </p>
                <p className="text-sm text-slate-600">Cette semaine</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Truck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {interventions.reduce((sum, i) => sum + (i.montant || 0), 0).toLocaleString()} EUR
                </p>
                <p className="text-sm text-slate-600">Budget planifie</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerte interventions imminentes */}
      {interventionsImminentes > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Timer className="w-6 h-6 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">
                  {interventionsImminentes} RDV{interventionsImminentes > 1 ? "s" : ""} cette semaine
                </p>
                <p className="text-sm text-orange-700">
                  Anticipez les indisponibilites pour optimiser votre logistique
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Liste vs Calendrier */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="w-4 h-4" />
            Calendrier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Liste des RDV</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  <p className="ml-3 text-slate-600">Chargement...</p>
                </div>
              ) : interventions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">
                    Aucun RDV planifie
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    Les interventions avec RDV confirme apparaitront ici
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interventions.map((intervention) => {
                    const rdvDate = intervention.rdv_date ? parseISO(intervention.rdv_date) : null;
                    const isImminent = intervention.rdv_date ? isImminente(intervention.rdv_date) : false;

                    return (
                      <div
                        key={intervention.id}
                        onClick={() => openDetail(intervention)}
                        className={`flex gap-6 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isImminent
                            ? "border-orange-200 bg-orange-50 hover:border-orange-300"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                        }`}
                      >
                        {/* Date */}
                        <div className="flex-shrink-0 w-28">
                          <div
                            className={`text-center p-3 rounded-lg ${
                              isImminent
                                ? "bg-orange-100 border border-orange-300"
                                : "bg-slate-100"
                            }`}
                          >
                            <p
                              className={`text-3xl font-bold ${
                                isImminent ? "text-orange-600" : "text-slate-900"
                              }`}
                            >
                              {rdvDate ? format(rdvDate, "dd") : "--"}
                            </p>
                            <p
                              className={`text-sm font-medium uppercase ${
                                isImminent ? "text-orange-700" : "text-slate-600"
                              }`}
                            >
                              {rdvDate ? format(rdvDate, "MMM", { locale: fr }) : "--"}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isImminent ? "text-orange-600" : "text-slate-500"
                              }`}
                            >
                              {rdvDate ? format(rdvDate, "HH:mm") : "--"}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Truck className="w-4 h-4 text-slate-500" />
                                <p className="font-bold text-slate-900">
                                  {intervention.vehicule || "Vehicule"}
                                </p>
                              </div>
                              <p className="text-sm font-mono font-semibold text-blue-600">
                                {getImmat(intervention)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {isImminent && (
                                <Badge
                                  variant="default"
                                  className="bg-orange-500 text-white"
                                >
                                  <Timer className="w-3 h-3 mr-1" />
                                  Imminent
                                </Badge>
                              )}
                              <Badge className="bg-green-600 text-white">
                                RDV confirme
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Wrench className="w-4 h-4 text-slate-400 mt-0.5" />
                            <p className="text-slate-700 font-medium">
                              {intervention.description}
                            </p>
                          </div>

                          {/* Lieu RDV */}
                          {intervention.rdv_lieu && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                              <p className="text-sm text-slate-600">
                                {intervention.rdv_lieu}
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <p className="text-sm text-slate-600">
                              {intervention.garage}
                            </p>
                            <p className="text-lg font-bold text-slate-900">
                              {(intervention.montant || 0).toLocaleString()} EUR
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="ml-3 text-slate-600">Chargement...</p>
            </div>
          ) : (
            <CalendarView
              events={calendarEvents}
              onEventClick={handleCalendarEventClick}
              onDateClick={(date) => {
                // Optionnel: filtrer ou scroll vers les événements de cette date
                toast.info(`Date sélectionnée: ${format(date, "dd/MM/yyyy")}`);
              }}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Sheet Detail */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle className="text-xl">{selectedIntervention?.vehicule}</SheetTitle>
                <SheetDescription className="font-mono text-base font-semibold text-blue-600">
                  {selectedIntervention ? getImmat(selectedIntervention) : ""}
                </SheetDescription>
              </div>
              <Badge className="shrink-0 bg-green-600 text-white">RDV planifié</Badge>
            </div>
          </SheetHeader>
          {selectedIntervention && (
            <div className="mt-6 space-y-6">
              {/* Résumé */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Résumé</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Wrench className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="font-medium text-slate-900">{selectedIntervention.description}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Garage</p>
                      <p className="font-medium text-slate-900">{selectedIntervention.garage}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Euro className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Montant</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(selectedIntervention.montant || 0).toLocaleString("fr-FR")} EUR
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Rendez-vous */}
              {selectedIntervention.rdv_date && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rendez-vous</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600 shrink-0" />
                        <p className="font-semibold text-green-800">
                          {format(parseISO(selectedIntervention.rdv_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                      {selectedIntervention.rdv_lieu && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                          <p className="text-green-700">{selectedIntervention.rdv_lieu}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Informations */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informations</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Créé le {selectedIntervention.date_creation
                      ? new Date(selectedIntervention.date_creation).toLocaleString("fr-FR")
                      : "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs select-all">{selectedIntervention.id}</span>
                  </div>
                </div>
              </div>

              {/* Fermer */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setDetailOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
