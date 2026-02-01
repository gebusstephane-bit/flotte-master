"use client";

/**
 * FleetHealthCard - Carte Santé du Parc PREMIUM
 * Design professionnel avec gradients, glassmorphism et animations
 */

import { motion } from "framer-motion";
import { Activity, CheckCircle2, AlertTriangle, TrendingUp, Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface FleetHealthCardProps {
  score: number;
  totalVehicles: number;
  criticalVehicles: number;
  className?: string;
}

export function FleetHealthCard({ 
  score, 
  totalVehicles, 
  criticalVehicles,
  className 
}: FleetHealthCardProps) {
  const isHealthy = score >= 80;
  const isWarning = score >= 60 && score < 80;
  const isCritical = score < 60;
  
  const okVehicles = totalVehicles - criticalVehicles;
  
  // Déterminer les couleurs selon le score
  const getGradientColors = () => {
    if (isHealthy) return "from-emerald-500 via-teal-500 to-cyan-500";
    if (isWarning) return "from-amber-500 via-orange-500 to-yellow-500";
    return "from-red-500 via-rose-500 to-pink-500";
  };
  
  const getScoreColor = () => {
    if (isHealthy) return "text-emerald-400";
    if (isWarning) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl",
        "bg-gradient-to-br",
        getGradientColors(),
        className
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      whileHover={{ scale: 1.01, y: -2 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Cercles décoratifs animés */}
        <motion.div 
          className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute -bottom-32 -left-20 w-80 h-80 bg-black/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.25, 0.15]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Grid pattern subtile */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="relative z-10">
        {/* Header avec icône */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <motion.div 
              className="flex items-center gap-2 mb-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-white/80 text-sm font-medium uppercase tracking-wider">
                Santé du Parc
              </span>
            </motion.div>
            
            <motion.div 
              className="flex items-baseline gap-3"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            >
              <span className="text-7xl font-bold tracking-tighter">
                {score}
                <span className="text-3xl font-medium text-white/60 ml-1">%</span>
              </span>
            </motion.div>
            
            <motion.p 
              className="text-white/70 text-sm mt-2 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isHealthy ? "Excellent état général" : 
               isWarning ? "Attention requise" : "Action immédiate nécessaire"}
            </motion.p>
          </div>
          
          {/* Icon décoratif */}
          <motion.div 
            className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            <Car className="w-10 h-10 text-white/90" />
          </motion.div>
        </div>

        {/* Progress Bar animée */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-white/80 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {okVehicles} véhicules en bon état
            </span>
            {criticalVehicles > 0 && (
              <span className="text-white/80 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {criticalVehicles} critiques
              </span>
            )}
          </div>
          
          <div className="h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div 
              className="h-full rounded-full relative"
              style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                boxShadow: '0 0 20px rgba(255,255,255,0.3)'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
            >
              {/* Shine effect */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.div>
          </div>
        </div>

        {/* Stats en bas */}
        <motion.div 
          className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="text-center">
            <p className="text-3xl font-bold">{totalVehicles}</p>
            <p className="text-xs text-white/60 uppercase tracking-wider mt-1">Total</p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-3xl font-bold text-emerald-300">{okVehicles}</p>
            <p className="text-xs text-white/60 uppercase tracking-wider mt-1">Opérationnels</p>
          </div>
          <div className="text-center">
            <p className={cn("text-3xl font-bold", criticalVehicles > 0 ? "text-red-300" : "text-emerald-300")}>
              {criticalVehicles}
            </p>
            <p className="text-xs text-white/60 uppercase tracking-wider mt-1">Alertes</p>
          </div>
        </motion.div>

        {/* Badge de tendance */}
        <motion.div 
          className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring" }}
        >
          <TrendingUp className="w-4 h-4" />
          <span>+2% ce mois</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default FleetHealthCard;
