"use client";

import { useState, useEffect } from "react";
import { Shield, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InitSuperAdminPage() {
  const [status, setStatus] = useState<"checking" | "not_exists" | "exists" | "creating" | "created" | "error">("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/init-superadmin");
      const data = await res.json();
      
      if (data.exists) {
        setStatus("exists");
      } else {
        setStatus("not_exists");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Erreur lors de la vérification");
    }
  };

  const createSuperAdmin = async () => {
    setStatus("creating");
    try {
      const res = await fetch("/api/init-superadmin", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        setStatus("created");
        setMessage(`Compte créé ! Email: ${data.email} / Mot de passe: ${data.password}`);
      } else {
        setStatus("error");
        setMessage(data.error || "Erreur lors de la création");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Erreur réseau");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-white text-2xl">Initialisation Super Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "checking" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          )}

          {status === "exists" && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-white mb-2">Le compte super admin existe déjà</p>
              <p className="text-slate-400 text-sm">fleet.master.contact@gmail.com</p>
              <Button 
                className="mt-4 bg-violet-600 hover:bg-violet-700"
                onClick={() => window.location.href = "/superadmin-login"}
              >
                Aller au login
              </Button>
            </div>
          )}

          {status === "not_exists" && (
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <p className="text-white mb-4">Aucun compte super admin trouvé</p>
              <Button 
                className="bg-violet-600 hover:bg-violet-700 w-full"
                onClick={createSuperAdmin}
              >
                Créer le compte super admin
              </Button>
            </div>
          )}

          {status === "creating" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mr-3" />
              <span className="text-white">Création en cours...</span>
            </div>
          )}

          {status === "created" && (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-white mb-4">{message}</p>
              <Button 
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => window.location.href = "/superadmin-login"}
              >
                Se connecter
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400">{message}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={checkStatus}
              >
                Réessayer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
