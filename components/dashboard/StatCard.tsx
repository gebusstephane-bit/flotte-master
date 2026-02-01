"use client";

/**
 * StatCard - Carte statistique PREMIUM
 * Design avec gradients, icônes colorées et animations
 */

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  href?: string;
  className?: string;
  delay?: number;
}

const variantStyles = {
  default: {
    gradient: "from-slate-500 to-slate-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    hoverBorder: "hover:border-slate-300",
    shadow: "shadow-slate-200/50",
  },
  success: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-50/80 to-teal-50/80",
    border: "border-emerald-200",
    iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
    iconColor: "text-emerald-600",
    hoverBorder: "hover:border-emerald-300",
    shadow: "shadow-emerald-200/50",
  },
  warning: {
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/80",
    border: "border-amber-200",
    iconBg: "bg-gradient-to-br from-amber-100 to-amber-200",
    iconColor: "text-amber-600",
    hoverBorder: "hover:border-amber-300",
    shadow: "shadow-amber-200/50",
  },
  danger: {
    gradient: "from-red-500 to-rose-500",
    bg: "bg-gradient-to-br from-red-50/80 to-rose-50/80",
    border: "border-red-200",
    iconBg: "bg-gradient-to-br from-red-100 to-red-200",
    iconColor: "text-red-600",
    hoverBorder: "hover:border-red-300",
    shadow: "shadow-red-200/50",
  },
  info: {
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-gradient-to-br from-blue-50/80 to-cyan-50/80",
    border: "border-blue-200",
    iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
    iconColor: "text-blue-600",
    hoverBorder: "hover:border-blue-300",
    shadow: "shadow-blue-200/50",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  href,
  className,
  delay = 0,
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  const TrendIcon = trend?.direction === "up" ? TrendingUp :
                    trend?.direction === "down" ? TrendingDown :
                    Minus;
  
  const Card = (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer group",
        styles.bg,
        styles.border,
        styles.hoverBorder,
        "hover:shadow-xl",
        styles.shadow,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      {/* Top gradient line */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", styles.gradient)} />
      
      {/* Hover arrow */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-5 h-5 text-slate-400" />
      </div>
      
      <div className="relative">
        {/* Header avec icône et trend */}
        <div className="flex items-start justify-between mb-4">
          <motion.div 
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
              styles.iconBg
            )}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Icon className={cn("w-6 h-6", styles.iconColor)} />
          </motion.div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
              variant === "success" && "bg-emerald-100 text-emerald-700",
              variant === "warning" && "bg-amber-100 text-amber-700",
              variant === "danger" && "bg-red-100 text-red-700",
              variant === "info" && "bg-blue-100 text-blue-700",
              variant === "default" && "bg-slate-100 text-slate-600"
            )}>
              <TrendIcon className="w-3.5 h-3.5" />
              {trend.value}
            </div>
          )}
        </div>
        
        {/* Value et title */}
        <div>
          <motion.h3 
            className="text-3xl font-bold text-slate-900 tracking-tight"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: delay + 0.1 }}
          >
            {value}
          </motion.h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">{title}</p>
        </div>

        {/* Bottom progress bar decorative */}
        <div className="mt-4 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
          <motion.div 
            className={cn("h-full rounded-full bg-gradient-to-r", styles.gradient)}
            initial={{ width: 0 }}
            animate={{ width: "70%" }}
            transition={{ duration: 0.8, delay: delay + 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
  
  if (href) {
    return <Link href={href} className="block">{Card}</Link>;
  }
  
  return Card;
}

export default StatCard;
