import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * API Route publique pour récupérer un véhicule par ID ou immatriculation
 * Utilise SERVICE ROLE pour contourner RLS (accès anonyme limité)
 * 
 * GET /api/public/vehicle?id=xxx
 * GET /api/public/vehicle?immat=xxx
 */
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
    let query = supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type, date_ct, date_tachy, date_atp, status");

    if (id) {
      // Décoder l'ID si nécessaire
      const decodedId = decodeURIComponent(id).trim();
      console.log("[API /public/vehicle] Looking up by ID:", decodedId);
      query = query.eq("id", decodedId);
    } else if (immat) {
      // Normaliser l'immatriculation
      const normalizedImmat = immat.toUpperCase().replace(/[^A-Z0-9]/g, "");
      console.log("[API /public/vehicle] Looking up by immat:", normalizedImmat);
      query = query.ilike("immat", `%${normalizedImmat}%`);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("[API /public/vehicle] Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Véhicule non trouvé" },
        { status: 404 }
      );
    }

    console.log("[API /public/vehicle] Found:", data);
    return NextResponse.json({ success: true, data });

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
