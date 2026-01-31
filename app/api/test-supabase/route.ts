import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Vérifier que les variables d'environnement sont chargées
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      keyPreview: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    };

    // Test 2: Tester la connexion à Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        envCheck,
        details: error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Connexion à Supabase réussie !',
      envCheck,
      vehicleCount: data?.length || 0,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
      details: error,
    }, { status: 500 });
  }
}
