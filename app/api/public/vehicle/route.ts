import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * API Route publique pour récupérer un véhicule par ID ou immatriculation
 * Utilise SERVICE ROLE pour contourner RLS (accès anonyme limité)
 * 
 * GET /api/public/vehicle?id=xxx
 * GET /api/public/vehicle?immat=xxx
 */

function normalizeImmat(immat: string): string {
  return immat.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  const immat = searchParams.get("immat");

  console.log("[API /public/vehicle] Request:", { id, immat });

  if (!id && !immat) {
    return NextResponse.json(
      { success: false, error: "ID ou immatriculation requis" },
      { status: 400 }
    );
  }

  try {
    if (id) {
      // Recherche par ID
      const decodedId = decodeURIComponent(id).trim();
      console.log("[API /public/vehicle] Looking up by ID:", decodedId);
      
      const { data, error } = await supabaseAdmin
        .from("vehicles")
        .select("id, immat, marque, type, date_ct, date_tachy, date_atp, status")
        .eq("id", decodedId)
        .single();

      if (error || !data) {
        console.log("[API /public/vehicle] Not found by ID");
        return NextResponse.json(
          { success: false, error: "Véhicule non trouvé" },
          { status: 404 }
        );
      }

      console.log("[API /public/vehicle] Found by ID:", data);
      return NextResponse.json({ success: true, data });
    }

    // Recherche par immatriculation
    if (immat) {
      const normalizedImmat = normalizeImmat(immat);
      console.log("[API /public/vehicle] Looking up by immat:", immat, "normalized:", normalizedImmat);

      // Stratégie : récupérer tous les véhicules et filtrer en mémoire
      // pour gérer les différents formats (avec/sans tirets)
      const { data: allVehicles, error } = await supabaseAdmin
        .from("vehicles")
        .select("id, immat, marque, type, date_ct, date_tachy, date_atp, status")
        .limit(1000);

      if (error) {
        console.error("[API /public/vehicle] Supabase error:", error);
        return NextResponse.json(
          { success: false, error: "Erreur base de données" },
          { status: 500 }
        );
      }

      // Filtrer les véhicules qui correspondent
      const matchingVehicles = (allVehicles || []).filter(v => {
        const dbImmatNormalized = normalizeImmat(v.immat);
        // Match si l'une contient l'autre (dans les deux sens)
        return dbImmatNormalized.includes(normalizedImmat) || 
               normalizedImmat.includes(dbImmatNormalized) ||
               v.immat.toUpperCase().includes(immat.toUpperCase()) ||
               immat.toUpperCase().includes(v.immat.toUpperCase());
      });

      console.log("[API /public/vehicle] Found", matchingVehicles.length, "matches");

      if (matchingVehicles.length === 0) {
        return NextResponse.json(
          { success: false, error: "Véhicule non trouvé" },
          { status: 404 }
        );
      }

      // Retourner le premier match (le plus proche)
      const bestMatch = matchingVehicles[0];
      console.log("[API /public/vehicle] Best match:", bestMatch);
      return NextResponse.json({ success: true, data: bestMatch });
    }

    return NextResponse.json(
      { success: false, error: "Paramètre invalide" },
      { status: 400 }
    );

  } catch (err: any) {
    console.error("[API /public/vehicle] Exception:", err);
    return NextResponse.json(
      { success: false, error: "Erreur serveur: " + err.message },
      { status: 500 }
    );
  }
}

// Support POST pour les requêtes CORS preflight
export async function POST(request: NextRequest) {
  return GET(request);
}

// Configuration CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
