"use client";

/**
 * LANDING PAGE PREMIUM - FleetFlow 2.0
 * Design haute gamme inspiré de Linear, Vercel, Notion
 * Dark mode, glassmorphism, animations fluides
 */

import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { 
  Truck, 
  Wrench, 
  ClipboardCheck, 
  Calendar, 
  QrCode, 
  Bell, 
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  FileText,
  Shield,
  Smartphone,
  Cloud,
  Sparkles,
  ChevronRight,
  Play,
  Menu,
  X,
  ArrowUpRight
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";

// ============================================
// ANIMATION CONFIG - Easing premium
// ============================================

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];
const easeInOutQuart: [number, number, number, number] = [0.76, 0, 0.24, 1];
const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: easeOutExpo }
};

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.6, ease: easeOutQuart }
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, ease: easeOutExpo }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const letterAnimation = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 }
};

// ============================================
// DATA
// ============================================

const features = [
  {
    icon: Truck,
    title: "Gestion du Parc",
    description: "Suivi complet de vos véhicules avec alertes automatiques pour contrôles techniques et tachygraphes.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Wrench,
    title: "Maintenance & Devis",
    description: "Gestion des interventions, devis en attente, validation workflow et suivi des coûts.",
    gradient: "from-orange-500 to-amber-400",
  },
  {
    icon: ClipboardCheck,
    title: "Inspections QR Code",
    description: "Les conducteurs scannent le QR et remplissent l'état des lieux. Sans compte requis.",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    icon: Calendar,
    title: "Planning RDV",
    description: "Calendrier des interventions planifiées avec date, heure et lieu. Vue liste ou calendrier.",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    icon: Bell,
    title: "Alertes Temps Réel",
    description: "Notifications pour contrôles techniques, devis à valider, interventions imminentes.",
    gradient: "from-rose-500 to-pink-400",
  },
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description: "Vue d'ensemble avec score de santé de la flotte, KPIs essentiels et véhicules en alerte.",
    gradient: "from-blue-600 to-indigo-400",
  },
];

const advancedFeatures = [
  { icon: FileText, title: "Exports PDF & CSV", description: "Exportez vos données pour vos rapports" },
  { icon: Shield, title: "Gestion des Rôles", description: "Permissions adaptées par profil" },
  { icon: Smartphone, title: "PWA Mobile", description: "Fonctionne hors ligne sur mobile" },
  { icon: Cloud, title: "Cloud Supabase", description: "Données sécurisées en temps réel" },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "29",
    description: "Parfait pour les petites flottes",
    features: ["Jusqu'à 10 véhicules", "3 utilisateurs", "Inspections QR illimitées", "Dashboard de base", "Support email"],
    cta: "Commencer",
    popular: false,
  },
  {
    name: "Pro",
    price: "79",
    description: "Pour les flottes en croissance",
    features: ["Jusqu'à 50 véhicules", "10 utilisateurs", "Toutes les inspections", "Planning avancé", "Exports PDF/CSV", "Alertes temps réel", "Support prioritaire"],
    cta: "Essai gratuit",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    description: "Pour les grandes organisations",
    features: ["Véhicules illimités", "Utilisateurs illimités", "API personnalisée", "On-premise possible", "Support dédié 24/7", "Formation incluse"],
    cta: "Contacter",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "FleetFlow a transformé notre gestion de flotte. Les alertes automatiques nous ont fait économiser des milliers d'euros.",
    author: "Marie Dupont",
    role: "Directrice Logistique",
    company: "Transports Dupont SAS",
  },
  {
    quote: "L'inspection par QR code est géniale. Nos conducteurs adorent la simplicité, et nous avons enfin un historique complet.",
    author: "Jean Martin",
    role: "Responsable de Parc",
    company: "LogiFleet Pro",
  },
  {
    quote: "En 6 mois, nous avons réduit nos coûts de maintenance de 23%. Le dashboard nous donne une visibilité totale.",
    author: "Pierre Lefebvre",
    role: "PDG",
    company: "EuroTransports",
  },
];

// ============================================
// COMPONENTS
// ============================================

function Spotlight({ className }: { className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(0, 102, 255, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">
        <div className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-b from-white/5 to-transparent" />
        <div className="relative h-full">
          <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10 group-hover:ring-white/20 transition-all duration-300" />
          <div className="relative h-full bg-[#12121a]/80 backdrop-blur-xl">
            {/* Content goes here */}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimatedText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <motion.span
      className={`inline-flex overflow-hidden ${className}`}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true }}
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          variants={letterAnimation}
          transition={{
            duration: 0.5,
            ease: easeOutExpo,
            delay: index * 0.03,
          }}
          className="inline-block"
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

function GradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5"
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: easeOutExpo }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Logo size="md" />

            <div className="hidden md:flex items-center gap-1">
              {["Fonctionnalités", "Tarifs", "Témoignages"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="relative px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors group"
                >
                  {item}
                  <span className="absolute inset-x-4 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white overflow-hidden rounded-full"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative">Essai gratuit</span>
                <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-white/60 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <motion.div
        className={`fixed inset-0 z-40 md:hidden ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        initial={false}
        animate={isMobileMenuOpen ? { opacity: 1 } : { opacity: 0 }}
      >
        <div className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-xl" />
        <motion.div
          className="relative flex flex-col items-center justify-center h-full gap-8"
          initial={false}
          animate={isMobileMenuOpen ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
        >
          {["Fonctionnalités", "Tarifs", "Témoignages"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-2xl font-semibold text-white/80 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className="flex flex-col gap-4 mt-8">
            <Link
              href="/login"
              className="text-lg font-medium text-white/60 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-full"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Essai gratuit
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[#0a0a0f]">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-600/10 rounded-full blur-[180px]" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px"
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20"
        style={{ y, opacity }}
      >
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm mb-8"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: easeOutExpo }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="text-sm font-medium text-white/70">Nouveau : Inspections IA disponibles</span>
            <ChevronRight className="w-4 h-4 text-white/50" />
          </motion.div>

          {/* Title */}
          <motion.h1
            className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: easeOutExpo }}
          >
            <span className="text-white">Gérez votre flotte</span>
            <br />
            <GradientText>comme un pro</GradientText>
          </motion.h1>

          {/* Description */}
          <motion.p
            className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeOutExpo }}
          >
            FleetFlow simplifie la gestion de votre parc automobile : inspections QR, 
            maintenance prédictive, planning intelligent et alertes automatiques.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: easeOutExpo }}
          >
            <Link
              href="/register"
              className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white overflow-hidden rounded-full"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 transition-all duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative">Commencer gratuitement</span>
              <ArrowRight className="relative w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#demo"
              className="group inline-flex items-center gap-3 px-8 py-4 text-lg font-medium text-white/70 hover:text-white transition-colors"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                <Play className="w-4 h-4 fill-current" />
              </span>
              Voir la démo
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {["14 jours d'essai", "Sans engagement", "Setup en 5 min"].map((badge) => (
              <div key={badge} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>{badge}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          className="mt-20 relative"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.4, ease: easeOutExpo }}
        >
          {/* Glow effect behind dashboard */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 via-cyan-500/10 to-transparent blur-3xl" />
          
          <div className="relative mx-auto max-w-5xl">
            {/* Browser chrome */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#12121a]/80 backdrop-blur-sm shadow-2xl shadow-black/50">
              {/* Browser header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#0f0f14]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1.5 rounded-lg bg-white/5 text-xs text-white/40 font-mono">
                    app.fleetflow.io/dashboard
                  </div>
                </div>
                <div className="w-16" />
              </div>
              
              {/* Dashboard content */}
              <div className="p-6 bg-gradient-to-br from-[#0f0f14] to-[#1a1a24]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Stat cards */}
                  {[
                    { icon: Truck, label: "Véhicules", value: "24", color: "blue" },
                    { icon: Bell, label: "Alertes", value: "2", color: "rose" },
                    { icon: Wrench, label: "Budget", value: "12.5k€", color: "emerald" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                          <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                        </div>
                        <span className="text-sm text-white/50">{stat.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  ))}
                </div>
                
                {/* Health score bar */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Santé de la flotte</p>
                      <p className="text-3xl font-bold text-white">92%</p>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-8 rounded-full ${
                            i < 4 ? "bg-gradient-to-t from-blue-500 to-cyan-400" : "bg-white/10"
                          }`}
                          style={{ height: `${24 + i * 8}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <motion.div
              className="absolute -right-4 top-1/4 p-4 rounded-xl bg-[#12121a]/90 border border-white/10 backdrop-blur-sm shadow-xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Inspection validée</p>
                  <p className="text-xs text-white/50">Il y a 2 minutes</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -left-4 bottom-1/4 p-4 rounded-xl bg-[#12121a]/90 border border-white/10 backdrop-blur-sm shadow-xl"
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Rappel CT</p>
                  <p className="text-xs text-white/50">Dans 5 jours</p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-1 h-2 rounded-full bg-white/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Features() {
  return (
    <section id="fonctionnalités" className="relative py-32 lg:py-40 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: easeOutExpo }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white/70">Fonctionnalités</span>
          </motion.div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Tout ce qu&apos;il faut pour{" "}
            <GradientText>votre flotte</GradientText>
          </h2>
          <p className="text-lg text-white/50">
            Des outils puissants et intuitifs pensés pour les gestionnaires de parc automobile.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative"
              variants={fadeInUp}
            >
              <div className="relative h-full p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden">
                {/* Spotlight effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                </div>
                
                <div className="relative">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} p-[1px] mb-6`}>
                    <div className="w-full h-full rounded-xl bg-[#12121a] flex items-center justify-center">
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-white/90 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-white/50 leading-relaxed group-hover:text-white/60 transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AdvancedFeatures() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: easeOutExpo }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-white/70">Fonctionnalités avancées</span>
            </motion.div>

            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
              Des outils puissants pour les{" "}
              <GradientText>professionnels</GradientText>
            </h2>
            <p className="text-lg text-white/50 mb-12 leading-relaxed">
              FleetFlow va au-delà du simple suivi. Profitez d&apos;outils avancés pour optimiser 
              votre gestion de parc et réduire vos coûts.
            </p>

            <div className="space-y-6">
              {advancedFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/[0.02] transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5, ease: easeOutExpo }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-1">{feature.title}</h4>
                    <p className="text-white/50">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: easeOutExpo }}
          >
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#12121a]/50 backdrop-blur-sm">
              {/* QR Code Preview */}
              <div className="p-8 bg-gradient-to-br from-[#0f0f14] to-[#1a1a24]">
                <div className="max-w-sm mx-auto">
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#12121a]">
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-center">
                      <Truck className="w-10 h-10 mx-auto mb-3 text-white" />
                      <h3 className="font-semibold text-white text-lg">FleetFlow Inspection</h3>
                    </div>
                    <div className="p-8 text-center">
                      <motion.div
                        className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-white p-4"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <div className="w-full h-full rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                          <QrCode className="w-16 h-16 text-white" />
                        </div>
                      </motion.div>
                      <p className="text-white font-medium mb-2">Scanner pour inspecter</p>
                      <p className="text-sm text-white/50 mb-6">Scan rapide avec l&apos;appareil photo</p>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-emerald-400 font-medium flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Véhicule AB-123-CD trouvé
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -z-10 top-1/2 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="tarifs" className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[150px] -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: easeOutExpo }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <span className="text-sm font-medium text-white/70">Tarifs</span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Simple et{" "}
            <GradientText>transparent</GradientText>
          </h2>
          <p className="text-lg text-white/50">
            Choisissez le plan qui correspond à vos besoins. Changez d&apos;échelle à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.popular
                  ? "bg-gradient-to-b from-blue-600/20 to-cyan-500/10 border border-blue-500/30"
                  : "bg-white/[0.02] border border-white/5 hover:border-white/10"
              } transition-all duration-500`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: easeOutExpo }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold rounded-full">
                  Plus populaire
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-white/50">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-bold text-white">
                  {plan.price !== "Sur mesure" && "€"}{plan.price}
                </span>
                {plan.price !== "Sur mesure" && (
                  <span className="text-white/40">/mois</span>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${
                      plan.popular ? "text-cyan-400" : "text-blue-400"
                    }`} />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3.5 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/25"
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="témoignages" className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: easeOutExpo }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white/70">Témoignages</span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Ils nous font{" "}
            <GradientText>confiance</GradientText>
          </h2>
          <p className="text-lg text-white/50">
            Des entreprises de toutes tailles utilisent FleetFlow au quotidien.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: easeOutExpo }}
            >
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/70 mb-8 leading-relaxed text-lg">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold text-lg">
                  {testimonial.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-white/50">{testimonial.role}</p>
                  <p className="text-xs text-white/40">{testimonial.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative py-32 lg:py-40 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: easeOutExpo }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-violet-600/20 to-cyan-500/30" />
          <div className="absolute inset-0 bg-[#0a0a0f]/80 backdrop-blur-sm" />
          
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-3xl p-[1px] bg-gradient-to-r from-blue-500/50 via-cyan-500/50 to-violet-500/50" />
          
          <div className="relative p-12 lg:p-20 text-center">
            <motion.h2
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
            >
              Prêt à transformer votre{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                gestion de flotte ?
              </span>
            </motion.h2>
            <motion.p
              className="text-lg text-white/60 mb-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Rejoignez des centaines d&apos;entreprises qui font confiance à FleetFlow.
              Essai gratuit de 14 jours, sans engagement.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <Link
                href="/register"
                className="group relative inline-flex items-center gap-3 px-8 py-4 text-lg font-semibold text-white overflow-hidden rounded-full"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 group-hover:scale-105" />
                <span className="relative">Commencer gratuitement</span>
                <ArrowRight className="relative w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="mailto:contact@fleetflow.io"
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium text-white/70 hover:text-white transition-colors"
              >
                Contacter les ventes
                <ArrowUpRight className="w-5 h-5" />
              </a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative py-16 border-t border-white/5">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <LogoMark size="sm" variant="dark" animated={false} />
              <span className="text-xl font-bold text-white">
                FLEET<span className="text-blue-500">FLOW</span>
              </span>
            </div>
            <p className="text-white/40 mb-6 max-w-sm leading-relaxed">
              La solution moderne de gestion de flotte automobile.
              Simplifiez vos processus, réduisez vos coûts.
            </p>
            <div className="flex gap-3">
              {[
                { name: "Twitter", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { name: "LinkedIn", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span className="sr-only">{social.name}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Produit</h4>
            <ul className="space-y-3">
              {["Fonctionnalités", "Tarifs", "Documentation", "API"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/50 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Légal</h4>
            <ul className="space-y-3">
              {["Mentions légales", "Confidentialité", "CGU", "Cookies"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-white/50 hover:text-white transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © 2026 FleetFlow. Tous droits réservés.
          </p>
          <p className="text-sm text-white/30">
            Fait avec passion en France 🇫🇷
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export default function LandingPageContent() {
  return (
    <main className="relative bg-[#0a0a0f] min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <AdvancedFeatures />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
