/**
 * Utilitaires de gestion d'erreurs standardisés
 * Garantit que les erreurs sont toujours visibles pour l'utilisateur
 */

import { toast } from "sonner";

interface ErrorHandlerOptions {
  /** Message affiché à l'utilisateur */
  userMessage?: string;
  /** Contexte pour le log console */
  context?: string;
  /** Action à effectuer après l'erreur (ex: reset loading state) */
  onError?: () => void;
  /** Ne pas afficher de toast (utile pour les erreurs silencieuses) */
  silent?: boolean;
}

/**
 * Gère une erreur de manière standardisée :
 * 1. Log dans la console avec contexte
 * 2. Toast pour l'utilisateur
 * 3. Callback optionnel
 * 
 * @example
 * try {
 *   await fetchData();
 * } catch (err) {
 *   handleError(err, { 
 *     context: "Chargement véhicule", 
 *     userMessage: "Impossible de charger le véhicule",
 *     onError: () => setLoading(false)
 *   });
 * }
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): void {
  const { 
    userMessage = "Une erreur est survenue", 
    context = "",
    onError,
    silent = false 
  } = options;

  // 1. Log console toujours présent
  const prefix = context ? `[${context}] ` : "";
  console.error(`${prefix}Erreur:`, error);

  // 2. Toast utilisateur (sauf si silent)
  if (!silent) {
    const message = error instanceof Error 
      ? `${userMessage}: ${error.message}` 
      : userMessage;
    toast.error(message);
  }

  // 3. Callback optionnel
  onError?.();
}

/**
 * Wrapper pour les fonctions async avec gestion d'erreur automatique
 * 
 * @example
 * const fetchData = withErrorHandling(
 *   async () => { return await api.getData(); },
 *   { context: "API", userMessage: "Erreur de chargement" }
 * );
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorHandlerOptions
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, options);
      return undefined;
    }
  };
}
