"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className="p-1.5 rounded opacity-50">
          <Sun className="w-3.5 h-3.5" />
        </div>
        <div className="p-1.5 rounded opacity-50">
          <Monitor className="w-3.5 h-3.5" />
        </div>
        <div className="p-1.5 rounded opacity-50">
          <Moon className="w-3.5 h-3.5" />
        </div>
      </div>
    );
  }

  const currentTheme = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/50 border border-slate-700">
      <button
        onClick={() => setTheme("light")}
        className={`p-1.5 rounded transition-colors ${
          currentTheme === "light"
            ? "bg-slate-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Mode clair"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`p-1.5 rounded transition-colors ${
          theme === "system"
            ? "bg-slate-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Thème système"
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`p-1.5 rounded transition-colors ${
          currentTheme === "dark"
            ? "bg-slate-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-slate-700"
        }`}
        title="Mode sombre"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
