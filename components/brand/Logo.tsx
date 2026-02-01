"use client";

/**
 * Logo - Composant logo FleetFlow 2.0
 * Version vectorielle animée remplaçant le collage d'icônes Lucide
 * 
 * @example
 * <Logo size="md" variant="light" />
 * <Logo size="lg" variant="dark" animated />
 * <LogoIcon size="sm" /> // Version icône seule
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  animated?: boolean;
  showText?: boolean;
}

interface LogoIconProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "light" | "dark";
  animated?: boolean;
  className?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const sizeConfig = {
  sm: { icon: 32, text: "text-lg", gap: "gap-2" },
  md: { icon: 40, text: "text-xl", gap: "gap-2.5" },
  lg: { icon: 56, text: "text-3xl", gap: "gap-3" },
  xl: { icon: 72, text: "text-4xl", gap: "gap-4" },
};

// ============================================
// LOGO MARK (Icône seule hexagonale)
// ============================================

export function LogoMark({ 
  size = "md", 
  variant = "light", 
  animated = true,
  className 
}: LogoIconProps) {
  const s = sizeConfig[size].icon;
  const isDark = variant === "dark";
  
  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center rounded-xl",
        isDark ? "bg-white" : "bg-gradient-to-br from-[#0066FF] to-[#0052CC]",
        "shadow-lg",
        className
      )}
      style={{ width: s, height: s }}
      whileHover={animated ? { scale: 1.05, rotate: 2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <svg 
        viewBox="0 0 40 40" 
        className="w-full h-full p-[20%]"
        fill="none"
      >
        {/* Hexagone background accent */}
        <motion.path
          d="M20 4 L36 12 L36 28 L20 36 L4 28 L4 12 Z"
          fill={isDark ? "#0066FF" : "white"}
          initial={animated ? { pathLength: 0, opacity: 0 } : false}
          animate={animated ? { pathLength: 1, opacity: 1 } : false}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        
        {/* Truck silhouette simplifiée */}
        <motion.path
          d="M11 22 H21 V27 H11 Z M21 22 L25 18 V27 H21"
          fill={isDark ? "white" : "#0066FF"}
          initial={animated ? { opacity: 0, x: -5 } : false}
          animate={animated ? { opacity: 1, x: 0 } : false}
          transition={{ delay: 0.3, duration: 0.4 }}
        />
        
        {/* Flow line dynamique */}
        <motion.path
          d="M27 21 Q31 21 33 19 Q35 17 33 15"
          stroke={isDark ? "#00D4AA" : "#00D4AA"}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={animated ? { pathLength: 0 } : false}
          animate={animated ? { pathLength: 1 } : false}
          transition={{ delay: 0.5, duration: 0.3 }}
        />
        
        {/* Petit cercle de flux */}
        <motion.circle
          cx="33"
          cy="15"
          r="2"
          fill="#00D4AA"
          initial={animated ? { scale: 0 } : false}
          animate={animated ? { scale: 1 } : false}
          transition={{ delay: 0.8, type: "spring" }}
        />
      </svg>
    </motion.div>
  );
}

// ============================================
// LOGO COMPLET (Icône + Texte)
// ============================================

export function Logo({ 
  size = "md", 
  variant = "light", 
  animated = true,
  showText = true
}: LogoProps) {
  const s = sizeConfig[size];
  const isDark = variant === "dark";
  
  return (
    <div className={cn("flex items-center", s.gap)}>
      <LogoMark size={size} variant={variant} animated={animated} />
      
      {showText && (
        <div className={s.text}>
          <span 
            className={cn(
              "font-bold tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            FLEET
          </span>
          <span className="font-bold text-[#0066FF]">
            FLOW
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// LOGO POUR SIDEBAR (Version compacte)
// ============================================

export function LogoSidebar({ animated = true }: { animated?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size="sm" variant="dark" animated={animated} />
      <div className="text-lg">
        <span className="font-bold text-white">FLEET</span>
        <span className="font-bold text-[#0066FF]">FLOW</span>
      </div>
    </div>
  );
}

// ============================================
// EXPORTS
// ============================================

export default Logo;
