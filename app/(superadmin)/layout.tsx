"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Building2, 
  BarChart3, 
  Settings, 
  LogOut,
  Shield,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

export default function SuperAdminLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== SUPER_ADMIN_EMAIL) {
        router.push("/superadmin/login");
        return;
      }
      
      setIsAuthorized(true);
    } catch (error) {
      router.push("/superadmin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/superadmin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/superadmin" },
    { icon: Building2, label: "Organisations", href: "/superadmin/organizations" },
    { icon: BarChart3, label: "Statistiques", href: "/superadmin/analytics" },
    { icon: Settings, label: "Paramètres", href: "/superadmin/settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">FleetFlow</h1>
              <p className="text-xs text-violet-400">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? "bg-violet-600/20 text-violet-300 border border-violet-600/30" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <span className="ml-4 text-white font-semibold">Super Admin</span>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
