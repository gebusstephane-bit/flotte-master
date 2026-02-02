/**
 * Logger professionnel pour FleetFlow
 * 
 * - Développement : tous les logs visibles
 * - Production : uniquement warn/error
 * - Pas de fuite de données sensibles
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

/**
 * Sanitize les données sensibles avant logging
 */
function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  
  const sensitiveFields = ["password", "token", "secret", "key", "auth", "cookie"];
  const sanitized: LogContext = {};
  
  for (const [key, value] of Object.entries(context)) {
    const isSensitive = sensitiveFields.some(field => 
      key.toLowerCase().includes(field)
    );
    
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeContext(value as LogContext);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (isDev || isTest) return true;
    // Production : uniquement warn et error
    return ["warn", "error"].includes(level);
  }

  private formatMessage(
    level: LogLevel,
    module: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = sanitizeContext(context);
    
    let logLine = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
    
    if (sanitizedContext && Object.keys(sanitizedContext).length > 0) {
      logLine += ` | ${JSON.stringify(sanitizedContext)}`;
    }
    
    return logLine;
  }

  debug(module: string, message: string, context?: LogContext): void {
    if (!this.shouldLog("debug")) return;
    console.debug(this.formatMessage("debug", module, message, context));
  }

  info(module: string, message: string, context?: LogContext): void {
    if (!this.shouldLog("info")) return;
    console.info(this.formatMessage("info", module, message, context));
  }

  warn(module: string, message: string, context?: LogContext): void {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatMessage("warn", module, message, context));
  }

  error(module: string, message: string, context?: LogContext): void {
    // Toujours logger les erreurs, même en production
    console.error(this.formatMessage("error", module, message, context));
    
    // Ici on pourrait ajouter Sentry, LogRocket, etc.
    // if (typeof window !== "undefined" && (window as any).Sentry) {
    //   (window as any).Sentry.captureMessage(message, { 
    //     level: "error",
    //     extra: context 
    //   });
    // }
  }

  /**
   * Logger spécial pour les erreurs d'API
   */
  apiError(
    endpoint: string,
    error: Error,
    context?: { userId?: string; statusCode?: number }
  ): void {
    this.error("API", `Error in ${endpoint}`, {
      error: error.message,
      stack: isDev ? error.stack : undefined,
      ...context,
    });
  }

  /**
   * Logger pour les performances (slow queries, etc.)
   */
  perf(operation: string, durationMs: number, context?: LogContext): void {
    if (durationMs > 1000) {
      this.warn("PERF", `Slow operation: ${operation} took ${durationMs}ms`, {
        duration: durationMs,
        ...context,
      });
    } else {
      this.debug("PERF", `${operation} took ${durationMs}ms`, {
        duration: durationMs,
        ...context,
      });
    }
  }
}

// Export singleton
export const logger = new Logger();

// Pour compatibilité avec les imports existants
export default logger;
