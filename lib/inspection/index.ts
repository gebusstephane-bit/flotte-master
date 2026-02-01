/**
 * 🔱 Module Vehicle Inspection - Exports
 * Architecture: A+ Certified
 */

// Types & Schemas
export * from "./types";

// Server Actions
export * from "./actions";

// Business Logic (export sélectif pour éviter conflit Defect)
export { 
  classifyDefect, 
  calculateVehicleHealthScore, 
  getInspectionStatus,
  type ScoringDefect,
  type SeverityLevel 
} from "./scoring";

// 🔱 GOD MODE: Predictive Analytics
export * from "./predictive";

// 🔱 GOD MODE: Export Functions
export * from "./export";
