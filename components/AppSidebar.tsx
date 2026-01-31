"use client";

import { useState } from "react";
import { LayoutDashboard, Truck, Wrench, Calendar, User, Users, LogOut, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PendingQuotesBadge, CriticalVehiclesBadge } from "@/components/NotificationBadge";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { getPermissions, ROLE_LABELS } from "@/lib/role";
import { Brand } from "@/components/Brand";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Mon Parc", icon: Truck, href: "/parc" },
  { name: "Maintenance", icon: Wrench, href: "/maintenance" },
  { name: "Planning", icon: Calendar, href: "/planning" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, loading, signOut } = useAuth();
  const permissions = getPermissions(role);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      // Force navigation dure vers login pour éviter tout état persistant
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace("/login");
      }
      toast.success("Déconnecté");
    } catch (err: unknown) {
      console.error("[LOGOUT]", err);
      toast.error("Erreur de déconnexion");
      setLoggingOut(false);
    }
  };

  const initials = profile
    ? `${(profile.prenom || "").charAt(0)}${(profile.nom || "").charAt(0)}`.toUpperCase() || null
    : null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b border-slate-800">
        <Brand size="sm" showTagline dark />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                  {item.href === "/maintenance" && <PendingQuotesBadge />}
                  {item.href === "/parc" && <CriticalVehiclesBadge />}
                </Link>
              </li>
            );
          })}

          {/* Utilisateurs — admin/direction uniquement */}
          {permissions.canManageUsers && (
            <li>
              <Link
                href="/admin/users"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Utilisateurs</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 py-2 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Thème</span>
          <ThemeToggle />
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-slate-700 text-white text-xs font-bold">
              {initials ?? <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {profile ? (
              <>
                <p className="font-medium text-sm truncate">
                  {profile.prenom} {profile.nom}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {profile.email}
                </p>
              </>
            ) : loading ? (
              <p className="text-xs text-slate-500">Chargement…</p>
            ) : (
              <>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email ?? "Non connecté"}
                </p>
                <Badge
                  variant="outline"
                  className="mt-1 text-[10px] border-orange-500 text-orange-400"
                >
                  Profil manquant
                </Badge>
              </>
            )}
            {profile && (
              <Badge
                variant="outline"
                className="mt-1 text-[10px] border-slate-600 text-slate-300"
              >
                {ROLE_LABELS[role] ?? role}
              </Badge>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Se déconnecter"
          >
            {loggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
