"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save } from "lucide-react";

export default function SettingsPage() {
  const [prices, setPrices] = useState({
    starter: 29,
    pro: 79,
    enterprise: 0,
  });

  const [limits, setLimits] = useState({
    starter: { vehicles: 10, users: 3 },
    pro: { vehicles: 50, users: 10 },
    enterprise: { vehicles: 999999, users: 999999 },
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-slate-400">Configuration globale de la plateforme</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Prix des plans */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-400" />
              Tarification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Starter (€/mois)</label>
                <Input
                  type="number"
                  value={prices.starter}
                  onChange={(e) => setPrices({ ...prices, starter: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Pro (€/mois)</label>
                <Input
                  type="number"
                  value={prices.pro}
                  onChange={(e) => setPrices({ ...prices, pro: Number(e.target.value) })}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Enterprise</label>
                <Input
                  type="text"
                  value="Sur mesure"
                  disabled
                  className="bg-slate-800 border-slate-700 text-slate-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limites */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Limites par plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(limits).map(([plan, limit]) => (
              <div key={plan} className="border-b border-slate-800 last:border-0 pb-6 last:pb-0">
                <h4 className="text-white font-medium capitalize mb-3">{plan}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Véhicules max</label>
                    <Input
                      type="number"
                      value={limit.vehicles}
                      onChange={(e) => setLimits({
                        ...limits,
                        [plan]: { ...limit, vehicles: Number(e.target.value) }
                      })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Utilisateurs max</label>
                    <Input
                      type="number"
                      value={limit.users}
                      onChange={(e) => setLimits({
                        ...limits,
                        [plan]: { ...limit, users: Number(e.target.value) }
                      })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button className="bg-violet-600 hover:bg-violet-700 text-white">
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
