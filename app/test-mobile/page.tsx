"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function TestMobilePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, msg]);
  };

  const runTests = async () => {
    setLoading(true);
    setLogs([]);
    
    // Test 1: Informations navigateur
    addLog("=== INFOS NAVIGATEUR ===");
    addLog(`UserAgent: ${navigator.userAgent.substring(0, 60)}`);
    addLog(`Online: ${navigator.onLine}`);
    addLog(`URL: ${window.location.href}`);
    
    // Test 2: Variables d'environnement
    addLog("");
    addLog("=== VARIABLES ENV ===");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    addLog(`SUPABASE_URL: ${supabaseUrl ? "✓ Présente" : "✗ MANQUANTE"}`);
    addLog(`SUPABASE_KEY: ${supabaseKey ? "✓ Présente" : "✗ MANQUANTE"}`);
    
    if (!supabaseUrl || !supabaseKey) {
      addLog("❌ ERREUR: Variables d'environnement manquantes!");
      setLoading(false);
      return;
    }
    
    addLog(`URL: ${supabaseUrl.substring(0, 30)}...`);
    
    // Test 3: Connexion Supabase
    addLog("");
    addLog("=== CONNEXION SUPABASE ===");
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      addLog("✓ Client créé");
      
      // Test 4: Requête simple
      addLog("");
      addLog("=== REQUÊTE VEHICLES ===");
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, immat")
        .limit(3);
      
      if (error) {
        addLog(`❌ ERREUR Supabase: ${error.message}`);
        addLog(`Code: ${error.code || "N/A"}`);
      } else {
        addLog(`✓ Succès! ${data?.length || 0} véhicules trouvés`);
        if (data && data.length > 0) {
          addLog(`Exemple: ${data[0].immat} (${data[0].id.substring(0, 8)}...)`);
        }
      }
    } catch (err: any) {
      addLog(`❌ EXCEPTION: ${err.message || "Unknown"}`);
      addLog(`Type: ${err.name || "N/A"}`);
    }
    
    // Test 5: Test API
    addLog("");
    addLog("=== TEST API ROUTE ===");
    try {
      const response = await fetch("/api/public/vehicle?id=test", {
        cache: "no-store"
      });
      addLog(`Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      addLog(`Réponse: ${text.substring(0, 100)}`);
    } catch (err: any) {
      addLog(`❌ ERREUR API: ${err.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-2">Test Mobile Debug</h1>
        <p className="text-sm text-slate-600 mb-4">
          Cette page teste la connexion à Supabase depuis votre mobile
        </p>
        
        <button
          onClick={runTests}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg mb-4 disabled:opacity-50 font-semibold"
        >
          {loading ? "Test en cours..." : "🚀 Lancer les tests"}
        </button>
        
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto" style={{ maxHeight: "60vh" }}>
          {logs.length === 0 ? (
            <span className="text-slate-500">Cliquez sur le bouton pour tester...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1 break-all leading-tight">
                {log.startsWith("===") ? <span className="text-yellow-400 font-bold">{log}</span> : 
                 log.startsWith("✓") ? <span className="text-green-400">{log}</span> :
                 log.startsWith("❌") ? <span className="text-red-400">{log}</span> :
                 log}
              </div>
            ))
          )}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
          <p className="font-semibold text-blue-800">💡 Instructions:</p>
          <ol className="list-decimal ml-4 mt-1 text-blue-700 space-y-1 text-xs">
            <li>Cliquez sur "Lancer les tests"</li>
            <li>Attendez que tous les tests passent</li>
            <li>Prenez une capture d'écran</li>
            <li>Envoyez-moi le résultat</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
