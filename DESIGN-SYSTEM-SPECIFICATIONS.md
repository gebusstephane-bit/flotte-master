# 🎨 Design System Specifications - FleetFlow 2.0

> Document technique d'implémentation pour les développeurs

---

## 📁 Structure des Fichiers Proposée

```
app/
├── globals.css                 # Variables CSS + imports
├── layout.tsx                  # Layout racine avec fonts
├── page.tsx                    # Dashboard
└── ...

components/
├── ui/                         # Composants shadcn/ui de base
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── brand/                      # NOUVEAU - Composants brand
│   ├── Logo.tsx               # Logo SVG animé
│   ├── LogoIcon.tsx           # Version icône seule
│   └── LogoMark.tsx           # Mark hexagonal
├── layout/                     # NOUVEAU - Layout components
│   ├── AppShell.tsx           # Shell principal
│   ├── Sidebar.tsx            # Navigation latérale
│   ├── MobileNav.tsx          # Navigation mobile
│   └── PageHeader.tsx         # Header de page
├── dashboard/                  # Composants dashboard
│   ├── FleetHealthCard.tsx    # Carte santé flotte
│   ├── StatCard.tsx           # Carte statistique
│   ├── VehicleAlertRow.tsx    # Ligne alerte véhicule
│   └── EmptyState.tsx         # État vide
└── inspection/                 # Composants inspection existants

lib/
├── design-system/              # NOUVEAU - Utilities design
│   ├── colors.ts              # Palette programmatique
│   ├── animations.ts          # Config Framer Motion
│   └── transitions.ts         # CSS transitions
└── ...

public/
├── logo/
│   ├── logo.svg               # Logo vectoriel
│   ├── logo-icon.svg          # Icône seule
│   └── logo-dark.svg          # Version dark
└── illustrations/
    ├── empty-vehicles.svg
    ├── empty-inspections.svg
    └── welcome.svg
```

---

## 🎨 Variables CSS Détaillées

### Fichier : `app/globals.css`

```css
/* ========================================
   FLEETFLOW 2.0 - DESIGN SYSTEM
   ======================================== */

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

/* ========================================
   THEME DEFINITION
   ======================================== */

@theme inline {
  /* Font Families */
  --font-sans: var(--font-inter);
  --font-display: var(--font-cal-sans);
  --font-mono: var(--font-jetbrains-mono);
  
  /* Base Colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  
  /* Brand Colors */
  --color-brand-primary: var(--brand-primary);
  --color-brand-primary-dark: var(--brand-primary-dark);
  --color-brand-accent: var(--brand-accent);
  --color-brand-warning: var(--brand-warning);
  --color-brand-danger: var(--brand-danger);
  --color-brand-purple: var(--brand-purple);
  
  /* Semantic Colors */
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  
  /* Card Colors */
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  
  /* Sidebar Colors */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  
  /* Chart Colors */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  
  /* Radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);
  --radius-3xl: calc(var(--radius) + 12px);
  --radius-4xl: calc(var(--radius) + 16px);
}

/* ========================================
   LIGHT THEME (Default)
   ======================================== */

:root {
  --radius: 0.75rem;
  
  /* Brand Colors */
  --brand-primary: #0066FF;
  --brand-primary-dark: #0052CC;
  --brand-accent: #00D4AA;
  --brand-warning: #FF9500;
  --brand-danger: #FF3B30;
  --brand-purple: #7C3AED;
  
  /* Base */
  --background: #FFFFFF;
  --foreground: #0F172A;
  
  /* Card */
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  
  /* Popover */
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  
  /* Primary (Brand) */
  --primary: #0066FF;
  --primary-foreground: #FFFFFF;
  
  /* Secondary */
  --secondary: #F1F5F9;
  --secondary-foreground: #1E293B;
  
  /* Muted */
  --muted: #F8FAFC;
  --muted-foreground: #64748B;
  
  /* Accent */
  --accent: #F1F5F9;
  --accent-foreground: #0F172A;
  
  /* Destructive */
  --destructive: #FF3B30;
  
  /* Borders */
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #0066FF;
  
  /* Sidebar */
  --sidebar: #0F172A;
  --sidebar-foreground: #F8FAFC;
  --sidebar-primary: #0066FF;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #1E293B;
  --sidebar-accent-foreground: #F8FAFC;
  --sidebar-border: #1E293B;
  --sidebar-ring: #0066FF;
  
  /* Chart Colors */
  --chart-1: #0066FF;
  --chart-2: #00D4AA;
  --chart-3: #FF9500;
  --chart-4: #FF3B30;
  --chart-5: #7C3AED;
}

/* ========================================
   DARK THEME
   ======================================== */

.dark {
  --background: #0F172A;
  --foreground: #F8FAFC;
  
  --card: #1E293B;
  --card-foreground: #F8FAFC;
  
  --popover: #1E293B;
  --popover-foreground: #F8FAFC;
  
  --primary: #0066FF;
  --primary-foreground: #FFFFFF;
  
  --secondary: #334155;
  --secondary-foreground: #F8FAFC;
  
  --muted: #334155;
  --muted-foreground: #94A3B8;
  
  --accent: #334155;
  --accent-foreground: #F8FAFC;
  
  --destructive: #FF453A;
  
  --border: #334155;
  --input: #334155;
  --ring: #0066FF;
  
  --sidebar: #0F172A;
  --sidebar-foreground: #F8FAFC;
  --sidebar-primary: #0066FF;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #1E293B;
  --sidebar-accent-foreground: #F8FAFC;
  --sidebar-border: #334155;
  --sidebar-ring: #0066FF;
}

/* ========================================
   BASE STYLES
   ======================================== */

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  
  body {
    @apply bg-background text-foreground antialiased;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  
  /* Selection */
  ::selection {
    background: rgba(0, 102, 255, 0.2);
    color: inherit;
  }
}

/* ========================================
   ANIMATION KEYFRAMES
   ======================================== */

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ========================================
   UTILITY CLASSES
   ======================================== */

@layer utilities {
  /* Animation utilities */
  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out;
  }
  
  .animate-pulse-subtle {
    animation: pulse-subtle 2s ease-in-out infinite;
  }
  
  .animate-slide-in-right {
    animation: slide-in-right 0.2s ease-out;
  }
  
  /* Gradient utilities */
  .bg-gradient-brand {
    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-accent) 100%);
  }
  
  .bg-gradient-card {
    background: linear-gradient(180deg, rgba(0, 102, 255, 0.08) 0%, rgba(0, 212, 170, 0.04) 100%);
  }
  
  /* Glass effect */
  .glass {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(8px);
  }
  
  .dark .glass {
    background: rgba(15, 23, 42, 0.8);
  }
  
  /* Text utilities */
  .text-balance {
    text-wrap: balance;
  }
}
```

---

## 🧩 Composants React

### 1. Logo Component

```tsx
// components/brand/Logo.tsx
"use client";

import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  animated?: boolean;
}

const sizeConfig = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 40, text: "text-xl" },
  lg: { icon: 56, text: "text-3xl" },
};

export function Logo({ size = "md", variant = "light", animated = true }: LogoProps) {
  const s = sizeConfig[size];
  const isDark = variant === "dark";
  
  return (
    <div className="flex items-center gap-3">
      {/* Animated Logo Mark */}
      <motion.div
        className={`relative rounded-xl ${isDark ? 'bg-white' : 'bg-[#0066FF]'}`}
        style={{ width: s.icon, height: s.icon }}
        whileHover={animated ? { scale: 1.05 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <svg viewBox="0 0 40 40" className="w-full h-full p-2">
          {/* Hexagon background */}
          <motion.path
            d="M20 4 L36 12 L36 28 L20 36 L4 28 L4 12 Z"
            fill={isDark ? "#0066FF" : "white"}
            initial={animated ? { pathLength: 0 } : false}
            animate={animated ? { pathLength: 1 } : false}
            transition={{ duration: 0.5 }}
          />
          {/* Truck silhouette */}
          <motion.path
            d="M12 20 H22 V26 H12 Z M22 20 L26 16 V26 H22"
            fill={isDark ? "white" : "#0066FF"}
            initial={animated ? { opacity: 0 } : false}
            animate={animated ? { opacity: 1 } : false}
            transition={{ delay: 0.3 }}
          />
          {/* Flow lines */}
          <motion.path
            d="M28 22 Q32 22 34 20 Q36 18 34 16"
            stroke={isDark ? "#00D4AA" : "#00D4AA"}
            strokeWidth="2"
            fill="none"
            initial={animated ? { pathLength: 0 } : false}
            animate={animated ? { pathLength: 1 } : false}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
        </svg>
      </motion.div>
      
      {/* Text */}
      <div className={s.text}>
        <span className={`font-display font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
          FLEET
        </span>
        <span className="font-display font-bold text-[#0066FF]">
          FLOW
        </span>
      </div>
    </div>
  );
}
```

### 2. Empty State Component

```tsx
// components/dashboard/EmptyState.tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: "vehicles" | "inspections" | "maintenance" | "default";
}

const illustrations = {
  vehicles: (
    <svg viewBox="0 0 200 120" className="w-48 h-28 mx-auto">
      <rect x="20" y="60" width="160" height="40" rx="8" fill="#F1F5F9" />
      <circle cx="50" cy="95" r="12" fill="#CBD5E1" />
      <circle cx="150" cy="95" r="12" fill="#CBD5E1" />
      <rect x="120" y="45" width="50" height="25" rx="4" fill="#E2E8F0" />
    </svg>
  ),
  inspections: (
    <svg viewBox="0 0 200 120" className="w-48 h-28 mx-auto">
      <rect x="40" y="20" width="120" height="80" rx="8" fill="#F1F5F9" />
      <circle cx="100" cy="55" r="20" fill="#E2E8F0" />
      <path d="M92 55 L98 61 L108 49" stroke="#CBD5E1" strokeWidth="3" fill="none" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 200 120" className="w-48 h-28 mx-auto">
      <circle cx="100" cy="60" r="35" fill="#F1F5F9" />
      <path d="M100 35 V50 M100 70 V85 M65 60 H80 M120 60 H135" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  default: null,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration = "default",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {illustrations[illustration] || (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0066FF]/10 to-[#00D4AA]/10 flex items-center justify-center mb-4">
          <Icon className="w-10 h-10 text-[#0066FF]" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-[#0F172A] dark:text-white mb-1">
        {title}
      </h3>
      
      <p className="text-sm text-[#64748B] max-w-sm mb-4">
        {description}
      </p>
      
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
```

### 3. Fleet Health Card

```tsx
// components/dashboard/FleetHealthCard.tsx
"use client";

import { motion } from "framer-motion";
import { Activity, CheckCircle2, AlertTriangle } from "lucide-react";

interface FleetHealthCardProps {
  score: number;
  totalVehicles: number;
  criticalVehicles: number;
}

export function FleetHealthCard({ score, totalVehicles, criticalVehicles }: FleetHealthCardProps) {
  const isHealthy = score >= 80;
  
  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#0052CC] p-6 text-white shadow-lg"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
      </div>
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Santé du Parc</p>
            <motion.h3
              className="text-5xl font-display font-bold mt-2"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {score}%
            </motion.h3>
            
            <div className="flex items-center gap-2 mt-3">
              {isHealthy ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
                  <span className="text-sm text-blue-100">Excellent état</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
                  <span className="text-sm text-blue-100">Attention requise</span>
                </>
              )}
            </div>
          </div>
          
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-8 h-8" />
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-blue-100">{totalVehicles - criticalVehicles} véhicules OK</span>
            <span className="text-blue-100">{criticalVehicles} critiques</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
```

### 4. Stat Card

```tsx
// components/dashboard/StatCard.tsx
"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  variant?: "default" | "warning" | "danger" | "success";
  href?: string;
}

const variantStyles = {
  default: {
    card: "bg-white border-[#E2E8F0]",
    icon: "bg-[#F1F5F9] text-[#64748B]",
  },
  warning: {
    card: "bg-[#FFF7ED] border-[#FED7AA]",
    icon: "bg-[#FF9500]/10 text-[#FF9500]",
  },
  danger: {
    card: "bg-[#FEF2F2] border-[#FECACA]",
    icon: "bg-[#FF3B30]/10 text-[#FF3B30]",
  },
  success: {
    card: "bg-[#ECFDF5] border-[#A7F3D0]",
    icon: "bg-[#00D4AA]/10 text-[#00D4AA]",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  href,
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  const Card = (
    <motion.div
      className={`relative overflow-hidden rounded-xl border p-5 transition-shadow hover:shadow-lg cursor-pointer ${styles.card}`}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend.direction === "up" ? "text-[#00D4AA]" :
            trend.direction === "down" ? "text-[#FF3B30]" :
            "text-[#64748B]"
          }`}>
            {trend.direction === "up" && <TrendingUp className="w-4 h-4" />}
            {trend.direction === "down" && <TrendingDown className="w-4 h-4" />}
            {trend.value}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-3xl font-display font-bold text-[#0F172A]">{value}</h3>
        <p className="text-sm text-[#64748B] mt-1">{title}</p>
      </div>
    </motion.div>
  );
  
  if (href) {
    return <Link href={href}>{Card}</Link>;
  }
  
  return Card;
}
```

---

## 📦 Installation des Dépendances

```bash
# Animation
npm install framer-motion

# Fonts
npm install @fontsource/inter

# Icons (déjà inclus via Lucide)
# Déjà présent : lucide-react

# Charts (pour dashboard analytics)
npm install recharts

# Date handling amélioré
npm install date-fns

# Class utilities
npm install clsx tailwind-merge
```

---

## 🔧 Configuration Tailwind

```typescript
// tailwind.config.ts (si nécessaire pour extensions)
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-cal-sans)", "system-ui"],
        sans: ["var(--font-inter)", "system-ui"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        brand: {
          primary: "#0066FF",
          "primary-dark": "#0052CC",
          accent: "#00D4AA",
          warning: "#FF9500",
          danger: "#FF3B30",
          purple: "#7C3AED",
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## ✅ Checklist d'Implémentation

### Phase 1 : Fondations

- [ ] Copier les variables CSS dans `globals.css`
- [ ] Créer les fichiers de composants brand
- [ ] Mettre à jour le layout racine avec les nouvelles fonts
- [ ] Tester le dark mode sur toutes les pages

### Phase 2 : Composants

- [ ] Remplacer les boutons existants par le nouveau style
- [ ] Créer les empty states pour chaque section
- [ ] Implémenter le nouveau FleetHealthCard
- [ ] Mettre à jour les stat cards du dashboard

### Phase 3 : Polish

- [ ] Ajouter les micro-animations avec Framer Motion
- [ ] Créer les illustrations SVG
- [ ] Optimiser les performances (lazy loading)
- [ ] Tester l'accessibilité (axe, contrastes)

---

*Document de spécifications techniques - FleetFlow 2.0 Design System*
