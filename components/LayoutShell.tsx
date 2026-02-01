"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLogin) {
    return <>{children}</>;
  }

  // Routes publiques sans sidebar (inspections)
  const isPublicRoute = pathname.startsWith("/inspection") || pathname.startsWith("/login");
  
  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar Mobile */}
      <div className={`
        fixed lg:hidden z-50 transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AppSidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-slate-50 p-4 lg:p-8 lg:ml-64">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-semibold text-slate-900">FleetFlow</span>
        </div>
        
        {children}
      </main>
    </div>
  );
}
