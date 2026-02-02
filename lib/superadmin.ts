"use server";

/**
 * Helpers pour le Super Admin Dashboard
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

export async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === SUPER_ADMIN_EMAIL;
}

export async function getSuperAdminSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  
  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return { user, supabase };
}
