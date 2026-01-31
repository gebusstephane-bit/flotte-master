"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { UserRole, getUserRole, setUserRole, ROLE_LABELS, ALL_ROLES } from "@/lib/role";
import { User } from "lucide-react";

const DEV_MODE = process.env.NODE_ENV === "development";

// Subscribe function for useSyncExternalStore
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getServerSnapshot(): UserRole {
  return "exploitation";
}

function getDevRoleSnapshot(): UserRole {
  if (typeof window === "undefined") return "exploitation";
  return getUserRole();
}

interface RoleSwitcherProps {
  onRoleChange?: (role: UserRole) => void;
}

export function RoleSwitcher({ onRoleChange }: RoleSwitcherProps) {
  const { role: authRole, profile } = useAuth();
  // Utilisation de useSyncExternalStore pour éviter setState dans useEffect
  const devRole = useSyncExternalStore(
    subscribe,
    getDevRoleSnapshot,
    getServerSnapshot
  );

  // In production, just show the auth role as a badge
  if (!DEV_MODE) {
    return (
      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
        <User className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">
          {profile ? `${profile.prenom} ${profile.nom}` : ROLE_LABELS[authRole]}
        </span>
      </div>
    );
  }

  // DEV mode: allow switching
  const handleChange = (newRole: UserRole) => {
    setUserRole(newRole);
    onRoleChange?.(newRole);
    // Force re-render via storage event simulation (current window)
    window.dispatchEvent(new StorageEvent("storage"));
  };

  return (
    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-300 shadow-sm">
      <User className="w-4 h-4 text-yellow-600" />
      <span className="text-xs text-yellow-700 font-bold mr-1">DEV</span>
      <select
        value={devRole}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer"
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
      </select>
    </div>
  );
}

export function useRole() {
  const { role: authRole } = useAuth();
  // Utilisation de useSyncExternalStore pour éviter setState dans useEffect
  const devRole = useSyncExternalStore(
    subscribe,
    getDevRoleSnapshot,
    getServerSnapshot
  );

  const role = DEV_MODE ? devRole : authRole;

  const updateRole = useCallback((newRole: UserRole) => {
    setUserRole(newRole);
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  return { role, setRole: updateRole };
}
