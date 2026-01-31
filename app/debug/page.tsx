"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, Shield } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function DebugPage() {
  const { role, loading: authLoading } = useAuth();

  const [connectionTest, setConnectionTest] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setConnectionTest(null);

    try {
      const { data, error, count } = await supabase
        .from("vehicles")
        .select("*", { count: "exact" });

      if (error) {
        setConnectionTest({ success: false, error: error.message });
        return;
      }

      setConnectionTest({ success: true, count: count || 0, vehicleCount: data?.length || 0 });
    } catch (err: any) {
      setConnectionTest({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (role === "admin" || role === "direction")) {
      testConnection();
    }
  }, [authLoading, role]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (role !== "admin" && role !== "direction") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-semibold text-slate-900">Accès réservé</h2>
        <p className="text-slate-500">Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Diagnostic</h1>
        <p className="text-slate-600 mt-2">
          Vérification de la connexion Supabase
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Test de connexion</CardTitle>
          <Button onClick={testConnection} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Tester
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-3 text-slate-600">Test en cours…</p>
            </div>
          )}

          {!loading && connectionTest && (
            <div>
              {connectionTest.success ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-bold text-green-900">Connexion OK</p>
                  <p className="text-sm mt-2">
                    {connectionTest.count} véhicule(s) trouvé(s) dans la base.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-bold text-red-900">Échec de connexion</p>
                  <p className="text-sm mt-2 text-red-700">{connectionTest.error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
