"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, type Profile } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/role";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  role: "exploitation",
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile via server API route (bypasses RLS completely)
  const fetchProfile = useCallback(async (userId: string) => {
    console.log("[AuthProvider] fetchProfile via /api/auth/profile for:", userId);

    try {
      const res = await fetch("/api/auth/profile", {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[AuthProvider] /api/auth/profile returned", res.status, body);
        setProfile(null);
        setLoading(false);
        return;
      }

      const { profile: profileData } = await res.json();

      if (profileData) {
        console.log("[AuthProvider] Profile loaded:", {
          email: profileData.email,
          role: profileData.role,
          prenom: profileData.prenom,
          nom: profileData.nom,
        });
        setProfile(profileData as Profile);
      } else {
        console.warn("[AuthProvider] Profile is null — row missing in public.profiles?");
        setProfile(null);
      }
    } catch (err) {
      console.error("[AuthProvider] fetchProfile network error:", err);
      setProfile(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Initial auth check
    supabase.auth.getUser().then(({ data: { user: u }, error }) => {
      if (cancelled) return;
      if (error && error.message && !error.message.includes("Auth session missing")) {
        console.error("[AuthProvider] getUser error:", error.message);
      }
      setUser(u ?? null);
      if (u) {
        fetchProfile(u.id);
      } else {
        console.log("[AuthProvider] No authenticated user");
        setLoading(false);
      }
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    try {
      // 1. SignOut complet côté Supabase (supprime cookies + session)
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('[AuthProvider] signOut error:', error);
      }
      // 2. Clear local state immédiatement
      setUser(null);
      setProfile(null);
      // 3. Clear tout storage potentiel
      if (typeof window !== 'undefined') {
        // Suppression du localStorage de dev (role)
        try { localStorage.removeItem('fleet_user_role'); } catch {}
      }
    } catch (err) {
      console.error('[AuthProvider] Unexpected signOut error:', err);
      throw err;
    }
  };

  const role: UserRole = profile?.role ?? "exploitation";

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
