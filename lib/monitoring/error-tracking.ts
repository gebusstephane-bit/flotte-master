/**
 * Error Tracking - Système de logging structuré avec batching
 * Usage: Côté client et serveur pour le tracking d'erreurs enrichi
 */

export type ErrorLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface ErrorContext {
  userId?: string;
  email?: string;
  role?: string;
  path?: string;
  method?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LogEntry {
  id: string;
  level: ErrorLevel;
  message: string;
  timestamp: string;
  context: ErrorContext;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorTrackingConfig {
  batchSize?: number;
  flushIntervalMs?: number;
  endpoint?: string;
  enabled?: boolean;
  sampleRate?: number;
  maxBatchAgeMs?: number;
}

const DEFAULT_CONFIG: Required<ErrorTrackingConfig> = {
  batchSize: 10,
  flushIntervalMs: 30000, // 30 secondes
  endpoint: "/api/logs",
  enabled: true,
  sampleRate: 1.0,
  maxBatchAgeMs: 60000, // 1 minute max avant flush forcé
};

class ErrorTracker {
  private config: Required<ErrorTrackingConfig>;
  private batch: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private entryTimestamps: number[] = []; // Pour suivre l'âge des entrées

  constructor(config: ErrorTrackingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.startFlushTimer();
    }
  }

  /**
   * Génère un ID unique pour chaque log entry
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Démarre le timer de flush périodique
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return;
    
    this.flushTimer = setInterval(() => {
      this.checkAndFlush();
    }, this.config.flushIntervalMs);
  }

  /**
   * Arrête le timer de flush
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Vérifie si un flush est nécessaire (taille ou âge)
   */
  private checkAndFlush(): void {
    const now = Date.now();
    const hasOldEntries = this.entryTimestamps.length > 0 && 
      (now - this.entryTimestamps[0]) > this.config.maxBatchAgeMs;
    
    if (this.batch.length >= this.config.batchSize || hasOldEntries) {
      this.flush();
    }
  }

  /**
   * Enrichit le contexte avec les informations de l'environnement
   */
  private enrichContext(context: ErrorContext = {}): ErrorContext {
    const isClient = typeof window !== "undefined";
    
    return {
      ...context,
      ...(isClient && {
        userAgent: navigator.userAgent,
        url: window.location.href,
        path: window.location.pathname,
      }),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Capture une stack trace propre
   */
  private captureStackTrace(error?: Error): string | undefined {
    if (!error) return undefined;
    
    // Nettoyer la stack trace pour ne garder que l'essentiel
    const stack = error.stack || "";
    const lines = stack.split("\n");
    
    // Garder la première ligne (message) et les 10 premières frames
    return lines.slice(0, 11).join("\n");
  }

  /**
   * Log un message avec niveau
   */
  log(level: ErrorLevel, message: string, context?: ErrorContext, error?: Error): void {
    if (!this.config.enabled) return;
    
    // Sampling: ignorer certains logs selon le sampleRate
    if (Math.random() > this.config.sampleRate) return;

    const entry: LogEntry = {
      id: this.generateId(),
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.enrichContext(context),
      stackTrace: this.captureStackTrace(error),
    };

    // En mode développement, logger immédiatement dans la console
    if (process.env.NODE_ENV === "development") {
      this.logToConsole(entry);
    }

    // Ajouter au batch
    this.batch.push(entry);
    this.entryTimestamps.push(Date.now());

    // Flush immédiat pour les erreurs critiques
    if (level === "fatal" || level === "error") {
      this.flush();
    } else {
      this.checkAndFlush();
    }
  }

  /**
   * Log dans la console pour le développement
   */
  private logToConsole(entry: LogEntry): void {
    const styles: Record<ErrorLevel, string> = {
      debug: "color: #6b7280",
      info: "color: #3b82f6",
      warn: "color: #f59e0b",
      error: "color: #ef4444; font-weight: bold",
      fatal: "color: #dc2626; font-weight: bold; background: #fee2e2",
    };

    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const style = styles[entry.level];

    if (entry.level === "error" || entry.level === "fatal") {
      console.error(`%c${prefix} ${entry.message}`, style, entry.context);
      if (entry.stackTrace) {
        console.error("Stack trace:", entry.stackTrace);
      }
    } else if (entry.level === "warn") {
      console.warn(`%c${prefix} ${entry.message}`, style, entry.context);
    } else {
      console.log(`%c${prefix} ${entry.message}`, style, entry.context);
    }
  }

  /**
   * Envoie le batch au serveur
   */
  async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const batchToSend = [...this.batch];
    this.batch = [];
    this.entryTimestamps = [];

    try {
      // Envoi au endpoint si configuré
      if (this.config.endpoint && typeof window !== "undefined") {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logs: batchToSend }),
          // Ne pas bloquer si le serveur ne répond pas
          keepalive: true,
        });
      }
    } catch (e) {
      // En cas d'échec, remettre les logs dans le batch (limité à 50)
      this.batch = [...batchToSend, ...this.batch].slice(0, 50);
      console.error("Failed to send logs:", e);
    }
  }

  /**
   * Méthodes utilitaires par niveau
   */
  debug(message: string, context?: ErrorContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: ErrorContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: ErrorContext, error?: Error): void {
    this.log("warn", message, context, error);
  }

  error(message: string, error?: Error, context?: ErrorContext): void {
    this.log("error", message, context, error);
  }

  fatal(message: string, error?: Error, context?: ErrorContext): void {
    this.log("fatal", message, context, error);
  }

  /**
   * Configure l'error tracker
   */
  setConfig(config: Partial<ErrorTrackingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enabled && !this.flushTimer) {
      this.startFlushTimer();
    } else if (!this.config.enabled && this.flushTimer) {
      this.stopFlushTimer();
    }
  }

  /**
   * Flush synchrone avant unload (pour les erreurs critiques)
   */
  flushSync(): void {
    if (this.batch.length === 0) return;

    const batchToSend = [...this.batch];
    this.batch = [];

    // Utiliser sendBeacon si disponible
    if (typeof navigator !== "undefined" && navigator.sendBeacon && this.config.endpoint) {
      navigator.sendBeacon(
        this.config.endpoint,
        new Blob([JSON.stringify({ logs: batchToSend })], { type: "application/json" })
      );
    }
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.stopFlushTimer();
    this.flush();
  }
}

// Instance singleton pour l'application
export const errorTracker = new ErrorTracker();

// Hook pour React components
export function useErrorTracker(config?: ErrorTrackingConfig) {
  // Retourne l'instance globale avec possibilité de config locale
  if (config) {
    errorTracker.setConfig(config);
  }
  return errorTracker;
}

// Helper pour wrap une fonction async avec tracking
export async function trackAsync<T>(
  fn: () => Promise<T>,
  operationName: string,
  context?: ErrorContext
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    errorTracker.debug(`${operationName} completed`, {
      ...context,
      durationMs: duration,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    errorTracker.error(
      `${operationName} failed after ${duration}ms`,
      error instanceof Error ? error : new Error(String(error)),
      { ...context, durationMs: duration }
    );
    
    throw error;
  }
}

export default errorTracker;
