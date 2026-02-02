import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-middleware";

/**
 * ROUTES PUBLIQUES - Accessibles SANS authentification
 * 
 * /inspection/* : Formulaire d'inspection pour conducteurs anonymes
 * /login : Page de connexion
 * /auth/* : Callbacks et routes d'authentification
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",             // Inscription
  "/inspection",           // Landing choix QR/Manuel
  "/auth",                 // Routes d'authentification
];

/**
 * Vérifie si le pathname correspond à une route publique
 */
function isPublicRoute(pathname: string): boolean {
  // Vérifier les préfixes publics
  const isPublicPrefix = PUBLIC_PATHS.some((p) => 
    pathname === p || pathname.startsWith(p + "/")
  );
  
  if (isPublicPrefix) return true;
  
  // API routes sont gérées séparément
  if (pathname.startsWith("/api")) return true;
  
  // Static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".")
  ) {
    return true;
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques : pas de vérification auth
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Toutes les autres routes nécessitent une session
  const { supabase, response } = createMiddlewareClient(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Stocker l'URL d'origine pour redirection post-login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
