"use client";

/**
 * LANDING PAGE CONTENT - FleetFlow
 * Composant client de la landing page (séparé pour permettre la redirection serveur)
 */

import { motion } from "framer-motion";
import Link from "next/link";
import { 
  Truck, 
  Wrench, 
  ClipboardCheck, 
  Calendar, 
  QrCode, 
  Bell, 
  Users, 
  FileText,
  Shield,
  Zap,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Star,
  Clock,
  Smartphone,
  Cloud
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";

// ============================================
// ANIMATION CONFIG
// ============================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// ============================================
// DATA - FONCTIONNALITÉS RÉELLES
// ============================================

const features = [
  {
    icon: Truck,
    title: "Gestion du Parc",
    description: "Suivi complet de vos véhicules : immatriculation, marque, type, contrôles techniques et tachygraphes avec alertes automatiques.",
    color: "#0066FF",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Wrench,
    title: "Maintenance & Devis",
    description: "Gestion des interventions, devis en attente, validation workflow et suivi des coûts par véhicule.",
    color: "#FF9500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: ClipboardCheck,
    title: "Inspections QR Code",
    description: "Les conducteurs scannent le QR du véhicule et remplissent le formulaire d'état des lieux. Sans compte requis.",
    color: "#00D4AA",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: Calendar,
    title: "Planning RDV",
    description: "Calendrier des interventions planifiées avec date, heure et lieu. Vue liste ou calendrier mensuel.",
    color: "#7C3AED",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Bell,
    title: "Alertes Temps Réel",
    description: "Notifications pour contrôles techniques à échéance, devis à valider, interventions imminentes.",
    color: "#FF3B30",
    bgColor: "bg-red-500/10",
  },
  {
    icon: BarChart3,
    title: "Dashboard Analytics",
    description: "Vue d'ensemble avec score de santé de la flotte, KPIs essentiels et véhicules en alerte.",
    color: "#0066FF",
    bgColor: "bg-blue-500/10",
  },
];

const advancedFeatures = [
  {
    icon: FileText,
    title: "Exports PDF & CSV",
    description: "Exportez vos données de parc, interventions et contrôles en PDF ou CSV pour vos rapports.",
  },
  {
    icon: Shield,
    title: "Gestion des Rôles",
    description: "Admin, Direction, Manager, Mécancien : chaque rôle a ses permissions adaptées.",
  },
  {
    icon: Smartphone,
    title: "PWA Mobile",
    description: "Application web progressive. Installez sur mobile, fonctionne hors ligne.",
  },
  {
    icon: Cloud,
    title: "Cloud Supabase",
    description: "Données sécurisées en cloud temps réel. Synchronisation instantanée entre utilisateurs.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "29",
    description: "Parfait pour les petites flottes",
    features: [
      "Jusqu'à 10 véhicules",
      "3 utilisateurs",
      "Inspections QR illimitées",
      "Dashboard de base",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "79",
    description: "Pour les flottes en croissance",
    features: [
      "Jusqu'à 50 véhicules",
      "10 utilisateurs",
      "Toutes les inspections",
      "Planning avancé",
      "Exports PDF/CSV",
      "Alertes temps réel",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    description: "Pour les grandes organisations",
    features: [
      "Véhicules illimités",
      "Utilisateurs illimités",
      "API personnalisée",
      "On-premise possible",
      "Support dédié 24/7",
      "Formation incluse",
    ],
    cta: "Contacter les ventes",
    popular: false,
  },
];

const testimonials = [
  {
    quote: "FleetFlow a transformé notre gestion de flotte. Les alertes automatiques nous ont fait économiser des milliers d'euros en évitant les pannes.",
    author: "Marie Dupont",
    role: "Directrice Logistique",
    company: "Transports Dupont SAS",
    rating: 5,
  },
  {
    quote: "L'inspection par QR code est géniale. Nos conducteurs adorent la simplicité, et nous avons enfin un historique complet.",
    author: "Jean Martin",
    role: "Responsable de Parc",
    company: "LogiFleet Pro",
    rating: 5,
  },
  {
    quote: "En 6 mois, nous avons réduit nos coûts de maintenance de 23%. Le dashboard nous donne une visibilité totale.",
    author: "Pierre Lefebvre",
    role: "PDG",
    company: "EuroTransports",
    rating: 5,
  },
];

// ============================================
// COMPONENTS
// ============================================

function Navbar() {
  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo size="md" />
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Tarifs
            </a>
            <a href="#testimonials" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
              Témoignages
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login"
              className="hidden sm:block text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Connexion
            </Link>
            <Link 
              href="/register"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white font-medium rounded-lg hover:bg-[#0052CC] transition-colors"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/50" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0066FF]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00D4AA]/5 rounded-full blur-3xl" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF]/10 text-[#0066FF] rounded-full text-sm font-medium mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Zap className="w-4 h-4" />
            <span>La solution de gestion de flotte préférée des pros</span>
          </motion.div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-slate-900 tracking-tight mb-6">
            Gérez votre flotte
            <span className="block text-[#0066FF]">sans prise de tête</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            FleetFlow simplifie la gestion de votre parc automobile : inspections QR, 
            maintenance, planning et alertes automatiques. Tout en un seul outil.
          </p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link 
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0066FF] text-white font-semibold rounded-xl hover:bg-[#0052CC] transition-all hover:shadow-lg hover:shadow-blue-500/25"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Voir les fonctionnalités
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div 
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
              <span>14 jours d&apos;essai gratuit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
              <span>Sans engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
              <span>Setup en 5 minutes</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Image / Dashboard Preview */}
        <motion.div 
          className="mt-16 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-900/20 border border-slate-200/60 bg-white">
            {/* Mock Dashboard UI */}
            <div className="bg-slate-900 p-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="ml-4 px-3 py-1 bg-slate-800 rounded text-xs text-slate-400">
                app.fleetflow.io/dashboard
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-slate-50 to-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Stat cards */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Truck className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="text-sm text-slate-600">Alertes Critiques</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">2</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <FileText className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="text-sm text-slate-600">Devis à Valider</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">5</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Wrench className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600">Budget Mensuel</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">12.5k€</p>
                </div>
              </div>
              {/* Fleet Health Bar */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Santé de la flotte</p>
                    <p className="text-2xl font-bold">92%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">Véhicules</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Tout ce qu&apos;il faut pour gérer votre flotte
          </h2>
          <p className="text-lg text-slate-600">
            Des fonctionnalités pensées pour les gestionnaires de parc, par des gestionnaires de parc.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="group p-6 rounded-2xl border border-slate-200 hover:border-[#0066FF]/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all bg-white"
              variants={fadeInUp}
            >
              <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function AdvancedFeatures() {
  return (
    <section className="py-20 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
              Fonctionnalités avancées pour les pros
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              FleetFlow va au-delà du simple suivi. Profitez d&apos;outils puissants pour optimiser votre gestion de parc.
            </p>

            <div className="space-y-6">
              {advancedFeatures.map((feature, index) => (
                <motion.div 
                  key={feature.title}
                  className="flex gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-10 h-10 bg-[#0066FF]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-[#0066FF]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">{feature.title}</h4>
                    <p className="text-slate-600 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              {/* QR Code Inspection Mock */}
              <div className="bg-slate-900 p-6">
                <div className="max-w-sm mx-auto bg-white rounded-2xl overflow-hidden">
                  <div className="bg-[#0066FF] p-4 text-white text-center">
                    <Truck className="w-8 h-8 mx-auto mb-2" />
                    <h3 className="font-semibold">FleetFlow Inspection</h3>
                  </div>
                  <div className="p-6 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <QrCode className="w-10 h-10 text-slate-600" />
                    </div>
                    <p className="text-slate-900 font-medium mb-2">Scanner le QR Code</p>
                    <p className="text-sm text-slate-500 mb-4">Scan rapide avec l&apos;appareil photo</p>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">✓ Véhicule AB-123-CD trouvé !</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -z-10 top-1/2 -right-10 w-40 h-40 bg-[#00D4AA]/20 rounded-full blur-2xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-[#0066FF]/20 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-lg text-slate-600">
            Choisissez le plan qui correspond à vos besoins. Changez d&apos;échelle à tout moment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${
                plan.popular 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                  : 'bg-white border border-slate-200'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0066FF] text-white text-sm font-medium rounded-full">
                  Plus populaire
                </div>
              )}
              
              <div className="mb-6">
                <h3 className={`text-xl font-semibold mb-2 ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>
                  {plan.price !== "Sur mesure" && "€"}{plan.price}
                </span>
                {plan.price !== "Sur mesure" && (
                  <span className={`text-sm ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                    /mois
                  </span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${plan.popular ? 'text-[#00D4AA]' : 'text-[#0066FF]'}`} />
                    <span className={`text-sm ${plan.popular ? 'text-slate-300' : 'text-slate-600'}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/register"
                className={`block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                  plan.popular
                    ? 'bg-[#0066FF] text-white hover:bg-[#0052CC]'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
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
    <section id="testimonials" className="py-20 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-lg text-slate-600">
            Des entreprises de toutes tailles utilisent FleetFlow au quotidien.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0066FF] to-[#00D4AA] rounded-full flex items-center justify-center text-white font-semibold">
                  {testimonial.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.role}, {testimonial.company}</p>
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
    <section className="py-20 lg:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="relative rounded-3xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0066FF] to-[#00D4AA]" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          
          <div className="relative p-12 lg:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Prêt à simplifier la gestion de votre flotte ?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Rejoignez des centaines d&apos;entreprises qui font confiance à FleetFlow. 
              Essai gratuit de 14 jours, sans engagement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#0066FF] font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a 
                href="mailto:contact@fleetflow.io"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
              >
                Contacter les ventes
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <LogoMark size="sm" variant="dark" animated={false} />
              <span className="text-xl font-bold text-white">FLEET<span className="text-[#0066FF]">FLOW</span></span>
            </div>
            <p className="text-slate-400 mb-6 max-w-sm">
              La solution moderne de gestion de flotte automobile. 
              Simplifiez vos processus, réduisez vos coûts.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Produit</h4>
            <ul className="space-y-3">
              <li><a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Tarifs</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Connexion</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Inscription</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li><a href="mailto:contact@fleetflow.io" className="hover:text-white transition-colors">contact@fleetflow.io</a></li>
              <li><span className="text-slate-500">Paris, France</span></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            © 2026 FleetFlow. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-300 transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Politique de confidentialité</a>
          </div>
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
    <main className="min-h-screen bg-white">
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
