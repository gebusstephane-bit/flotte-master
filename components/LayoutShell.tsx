"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 ml-64 bg-slate-50 p-8">{children}</main>
    </div>
  );
}
