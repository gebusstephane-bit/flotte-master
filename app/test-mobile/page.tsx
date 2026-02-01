"use client";

import { useState } from "react";

export default function TestMobilePage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testAPI = async () => {
    setLoading(true);
    setResults([]);
    
    // Test 1: Vérifier l'environnement
    addLog("=== TEST MOBILE ===");
    addLog(`UserAgent: ${navigator.userAgent.substring(0, 50)}...`);
    addLog(`Online: ${navigator.onLine}`);
    
    // Test 2: Appel API avec un ID de test
    const testId = "00000000-0000-0000-0000-000000000000";
    const apiUrl = `/api/public/vehicle?id=${encodeURIComponent(testId)}`;
    
    addLog(`Appel API: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store",
      });
      
      addLog(`Status HTTP: ${response.status}`);
      addLog(`Status Text: ${response.statusText}`);
      
      const text = await response.text();
      addLog(`Réponse brute: ${text.substring(0, 200)}`);
      
      try {
        const json = JSON.parse(text);
        addLog(`JSON parsé: ${JSON.stringify(json, null, 2).substring(0, 200)}`);
      } catch {
        addLog("⚠️ Réponse n'est pas du JSON valide");
      }
      
    } catch (err: any) {
      addLog(`❌ ERREUR: ${err.message || "Unknown error"}`);
      addLog(`Type: ${err.name || "unknown"}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Test Mobile API</h1>
        
        <button
          onClick={testAPI}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg mb-4 disabled:opacity-50"
        >
          {loading ? "Test en cours..." : "Lancer le test API"}
        </button>
        
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
          {results.length === 0 ? (
            <span className="text-slate-500">Cliquez sur le bouton pour tester...</span>
          ) : (
            results.map((r, i) => (
              <div key={i} className="mb-1 break-all">{r}</div>
            ))
          )}
        </div>
        
        <div className="mt-4 p-4 bg-amber-50 rounded-lg text-sm">
          <p className="font-semibold text-amber-800">Instructions:</p>
          <ol className="list-decimal ml-4 mt-2 text-amber-700 space-y-1">
            <li>Ouvrez cette page sur votre mobile: <b>/test-mobile</b></li>
            <li>Cliquez sur "Lancer le test API"</li>
            <li>Prenez une capture d'écran du résultat</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
