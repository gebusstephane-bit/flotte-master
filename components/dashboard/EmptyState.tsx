"use client";

/**
 * EmptyState - États vides illustrés FleetFlow 2.0
 * Remplace les messages textuels basiques par des illustrations engageantes
 * 
 * @example
 * <EmptyState 
 *   type="vehicles" 
 *   title="Aucun véhicule"
 *   description="Commencez par ajouter votre premier véhicule"
 *   action={{ label: "Ajouter", onClick: () => {} }}
 * />
 */

import { motion } from "framer-motion";
import { LucideIcon, Plus, Search, ClipboardCheck, Wrench } from "lucide-react";
import { ButtonUnified } from "@/components/ui/button-unified";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface EmptyStateProps {
  /** Type d'illustration prédéfinie */
  type?: "vehicles" | "inspections" | "maintenance" | "search" | "default";
  /** Titre principal */
  title: string;
  /** Description secondaire */
  description: string;
  /** Action principale */
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary";
  };
  /** Action secondaire (lien texte) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Icône personnalisée (si type === "default") */
  icon?: LucideIcon;
  /** Classes CSS additionnelles */
  className?: string;
  /** Variante compacte (pour les tableaux) */
  compact?: boolean;
}

// ============================================
// ILLUSTRATIONS SVG
// ============================================

const Illustrations = {
  vehicles: (
    <svg viewBox="0 0 200 120" className="w-48 h-28" fill="none">
      {/* Route */}
      <rect x="10" y="95" width="180" height="8" rx="4" fill="#E2E8F0" />
      {/* Corps véhicule */}
      <rect x="30" y="55" width="120" height="45" rx="8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      {/* Cabine */}
      <rect x="130" y="40" width="45" height="60" rx="6" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
      {/* Pare-brise */}
      <rect x="135" y="48" width="35" height="25" rx="3" fill="#E0F2FE" />
      {/* Roues */}
      <circle cx="55" cy="100" r="14" fill="#64748B" />
      <circle cx="55" cy="100" r="8" fill="#94A3B8" />
      <circle cx="150" cy="100" r="14" fill="#64748B" />
      <circle cx="150" cy="100" r="8" fill="#94A3B8" />
      {/* Détails */}
      <rect x="40" y="65" width="25" height="8" rx="2" fill="#CBD5E1" />
      <rect x="70" y="65" width="25" height="8" rx="2" fill="#CBD5E1" />
      {/* Élément décoratif */}
      <motion.circle 
        cx="180" cy="30" r="8" 
        fill="#0066FF" 
        fillOpacity="0.2"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </svg>
  ),
  
  inspections: (
    <svg viewBox="0 0 200 120" className="w-48 h-28" fill="none">
      {/* Presse-papiers */}
      <rect x="60" y="20" width="80" height="90" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      {/* Pince */}
      <rect x="85" y="12" width="30" height="12" rx="3" fill="#94A3B8" />
      {/* Lignes checklist */}
      <rect x="75" y="45" width="50" height="4" rx="2" fill="#CBD5E1" />
      <rect x="75" y="55" width="40" height="4" rx="2" fill="#CBD5E1" />
      <rect x="75" y="65" width="45" height="4" rx="2" fill="#CBD5E1" />
      {/* Checkmark animé */}
      <motion.circle 
        cx="135" cy="80" r="15" 
        fill="#00D4AA" 
        fillOpacity="0.2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      />
      <motion.path
        d="M128 80 L133 85 L142 76"
        stroke="#00D4AA"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
      />
    </svg>
  ),
  
  maintenance: (
    <svg viewBox="0 0 200 120" className="w-48 h-28" fill="none">
      {/* Cercle outils */}
      <circle cx="100" cy="60" r="40" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      {/* Clé */}
      <motion.g
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        style={{ transformOrigin: "100px 60px" }}
      >
        <circle cx="85" cy="60" r="12" fill="#64748B" />
        <rect x="93" y="56" width="25" height="8" rx="2" fill="#64748B" />
        <circle cx="85" cy="60" r="6" fill="#F1F5F9" />
      </motion.g>
      {/* Engrenage */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "115px 55px" }}
      >
        <circle cx="115" cy="55" r="10" fill="#CBD5E1" />
        <rect x="113" y="40" width="4" height="8" rx="1" fill="#CBD5E1" />
        <rect x="113" y="62" width="4" height="8" rx="1" fill="#CBD5E1" />
        <rect x="100" y="53" width="8" height="4" rx="1" fill="#CBD5E1" />
        <rect x="122" y="53" width="8" height="4" rx="1" fill="#CBD5E1" />
      </motion.g>
    </svg>
  ),
  
  search: (
    <svg viewBox="0 0 200 120" className="w-48 h-28" fill="none">
      {/* Loupe */}
      <circle cx="90" cy="55" r="30" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="3" />
      <line x1="112" y1="77" x2="135" y2="100" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
      {/* Points de recherche */}
      <motion.circle 
        cx="145" cy="35" r="4" 
        fill="#0066FF" 
        fillOpacity="0.3"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
      />
      <motion.circle 
        cx="160" cy="45" r="3" 
        fill="#0066FF" 
        fillOpacity="0.2"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      />
    </svg>
  ),
  
  default: null,
};

// ============================================
// COMPOSANT
// ============================================

export function EmptyState({
  type = "default",
  title,
  description,
  action,
  secondaryAction,
  icon: CustomIcon,
  className,
  compact = false,
}: EmptyStateProps) {
  const Icon = type === "vehicles" ? null : 
               type === "inspections" ? ClipboardCheck :
               type === "maintenance" ? Wrench :
               type === "search" ? Search :
               CustomIcon || Search;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-12 px-6",
        className
      )}
    >
      {/* Illustration ou Icône */}
      {Illustrations[type] || (
        Icon && (
          <motion.div 
            className={cn(
              "rounded-full bg-gradient-to-br from-[#0066FF]/10 to-[#00D4AA]/10 flex items-center justify-center mb-4",
              compact ? "w-14 h-14" : "w-20 h-20"
            )}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Icon className={cn(
              "text-[#0066FF]",
              compact ? "w-7 h-7" : "w-10 h-10"
            )} />
          </motion.div>
        )
      )}
      
      {/* Illustration SVG si disponible */}
      {Illustrations[type] && (
        <div className="mb-4">
          {Illustrations[type]}
        </div>
      )}
      
      {/* Titre */}
      <h3 className={cn(
        "font-semibold text-slate-900",
        compact ? "text-base" : "text-lg"
      )}>
        {title}
      </h3>
      
      {/* Description */}
      <p className={cn(
        "text-slate-500 mt-1 max-w-sm",
        compact ? "text-sm" : "text-sm"
      )}>
        {description}
      </p>
      
      {/* Action principale */}
      {action && (
        <div className="mt-4">
          <ButtonUnified
            variant={action.variant || "primary"}
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={action.onClick}
            size={compact ? "sm" : "md"}
          >
            {action.label}
          </ButtonUnified>
        </div>
      )}
      
      {/* Action secondaire */}
      {secondaryAction && (
        <button
          onClick={secondaryAction.onClick}
          className="mt-3 text-sm text-[#0066FF] hover:text-[#0052CC] hover:underline transition-colors"
        >
          {secondaryAction.label}
        </button>
      )}
    </motion.div>
  );
}

// ============================================
// VARIANTES PRÉDÉFINIES
// ============================================

export function EmptyStateVehicles(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="vehicles" {...props} />;
}

export function EmptyStateInspections(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="inspections" {...props} />;
}

export function EmptyStateMaintenance(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="maintenance" {...props} />;
}

export function EmptyStateSearch(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="search" {...props} />;
}

export default EmptyState;
