import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase-middleware";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

/**
 * ROUTES PUBLIQUES - Accessibles SANS authentification
 */
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/inspection",
  "/auth",
];

function isPublicRoute(pathname: string): boolean {
  const isPublicPrefix = PUBLIC_PATHS.some((p) => 
    pathname === p || pathname.startsWith(p + "/")
  );
  
  if (isPublicPrefix) return true;
  
  if (pathname.startsWith("/api")) return true;
  
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

  const { supabase, response } = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  // SUPER ADMIN ROUTES - Protection spéciale
  if (pathname.startsWith("/superadmin")) {
    // Allow access to login page
    if (pathname === "/superadmin/login") {
      // If already logged in as superadmin, redirect to dashboard
      if (user?.email === SUPER_ADMIN_EMAIL) {
        return NextResponse.redirect(new URL("/superadmin", request.url));
      }
      return NextResponse.next();
    }

    // All other /superadmin routes require superadmin
    if (!user || user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.redirect(new URL("/superadmin/login", request.url));
    }

    return response;
  }

  // Toutes les autres routes protégées nécessitent une session
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
