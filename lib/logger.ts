/**
 * Logger centralisé pour Fleet-Master
 * Usage: côté serveur uniquement (API routes, Server Components)
 * Ne pas importer dans les composants client.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  email?: string;
  role?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

const isDev = process.env.NODE_ENV === "development";

function sanitizeContext(ctx: LogContext): LogContext {
  // Ne jamais logger de données sensibles
  const { userId, email, role, path, method, ...rest } = ctx;
  return {
    ...(userId && { userId: userId.slice(0, 8) + "..." }), // Tronquer
    ...(email && { email: email.split("@")[0] + "@..." }), // Masquer domaine
    ...(role && { role }),
    ...(path && { path }),
    ...(method && { method }),
    ...rest,
  };
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const ctx = context ? ` | ${JSON.stringify(sanitizeContext(context))}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}${ctx}`;
}

export const logger = {
  debug: (module: string, message: string, context?: LogContext) => {
    if (isDev) {
      console.debug(formatMessage("debug", module, message, context));
    }
  },

  info: (module: string, message: string, context?: LogContext) => {
    console.info(formatMessage("info", module, message, context));
  },

  warn: (module: string, message: string, context?: LogContext) => {
    console.warn(formatMessage("warn", module, message, context));
  },

  error: (module: string, message: string, error?: Error, context?: LogContext) => {
    const errorContext = error
      ? { ...context, errorName: error.name, errorMessage: error.message }
      : context;
    console.error(formatMessage("error", module, message, errorContext));
  },

  // Audit: pour les actions sensibles (delete, update role, etc.)
  audit: (action: string, target: string, context: LogContext) => {
    console.info(
      formatMessage("info", "AUDIT", `${action} on ${target}`, context)
    );
  },
};
