"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type RetryState = "idle" | "loading" | "success" | "error";

export interface RetryConfig {
  /** Nombre maximum de tentatives (défaut: 3) */
  maxRetries?: number;
  /** Délai initial en ms (défaut: 1000) */
  delay?: number;
  /** Multiplicateur pour exponential backoff (défaut: 2) */
  backoffMultiplier?: number;
  /** Délai maximum entre les retries en ms (défaut: 30000) */
  maxDelay?: number;
  /** Callback appelé à chaque erreur retryable */
  onError?: (error: Error, attempt: number) => void;
  /** Callback appelé quand toutes les tentatives ont échoué */
  onFinalError?: (error: Error) => void;
  /** Callback appelé au succès */
  onSuccess?: <T>(data: T) => void;
  /** Condition pour déterminer si l'erreur est retryable (défaut: toujours retry) */
  retryCondition?: (error: Error) => boolean;
  /** Délai avant la première tentative en ms (défaut: 0) */
  initialDelay?: number;
}

export interface RetryResult<T> {
  /** Données retournées par la fonction */
  data: T | null;
  /** État actuel du retry */
  state: RetryState;
  /** Erreur si state === "error" */
  error: Error | null;
  /** Numéro de la tentative actuelle (1-based) */
  attempt: number;
  /** Nombre total de retries effectués */
  retryCount: number;
  /** Fonction pour déclencher manuellement le retry */
  execute: () => Promise<T | null>;
  /** Fonction pour réinitialiser le state */
  reset: () => void;
  /** Booléen indiquant si une tentative est en cours */
  isLoading: boolean;
  /** Booléen indiquant si on peut encore retry */
  canRetry: boolean;
}

const DEFAULT_CONFIG: Required<Omit<RetryConfig, "onError" | "onFinalError" | "onSuccess" | "retryCondition">> = {
  maxRetries: 3,
  delay: 1000,
  backoffMultiplier: 2,
  maxDelay: 30000,
  initialDelay: 0,
};

/**
 * Hook pour retry automatique avec exponential backoff
 * 
 * @example
 * ```tsx
 * const { data, state, error, execute, retryCount } = useRetry(
 *   () => fetchData(),
 *   { maxRetries: 3, delay: 1000 }
 * );
 * 
 * useEffect(() => {
 *   execute();
 * }, []);
 * ```
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): RetryResult<T> {
  const {
    maxRetries,
    delay,
    backoffMultiplier,
    maxDelay,
    onError,
    onFinalError,
    onSuccess,
    retryCondition,
    initialDelay,
  } = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<RetryState>("idle");
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const fnRef = useRef(fn);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Mettre à jour la ref de la fonction si elle change
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Calcule le délai pour une tentative donnée avec exponential backoff
   */
  const calculateDelay = useCallback((attemptNumber: number): number => {
    const exponentialDelay = delay * Math.pow(backoffMultiplier, attemptNumber - 1);
    return Math.min(exponentialDelay, maxDelay);
  }, [delay, backoffMultiplier, maxDelay]);

  /**
   * Attend un certain délai (annulable)
   */
  const wait = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (abortControllerRef.current?.signal.aborted) {
          reject(new Error("Retry aborted"));
        } else {
          resolve();
        }
      }, ms);

      abortControllerRef.current?.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Retry aborted"));
      });
    });
  }, []);

  /**
   * Exécute la fonction avec retry
   */
  const execute = useCallback(async (): Promise<T | null> => {
    // Annuler toute exécution précédente
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setState("loading");
    setError(null);
    setAttempt(0);
    setRetryCount(0);

    // Délai initial optionnel
    if (initialDelay > 0) {
      try {
        await wait(initialDelay);
      } catch {
        return null;
      }
    }

    for (let currentAttempt = 1; currentAttempt <= maxRetries + 1; currentAttempt++) {
      if (!isMountedRef.current) return null;

      setAttempt(currentAttempt);

      try {
        const result = await fnRef.current();

        if (!isMountedRef.current) return null;

        setData(result);
        setState("success");
        setError(null);
        onSuccess?.(result);

        return result;
      } catch (err) {
        if (!isMountedRef.current) return null;

        const currentError = err instanceof Error ? err : new Error(String(err));

        // Vérifier si on doit retry cette erreur
        if (retryCondition && !retryCondition(currentError)) {
          setError(currentError);
          setState("error");
          onFinalError?.(currentError);
          return null;
        }

        // Dernière tentative échouée
        if (currentAttempt > maxRetries) {
          setError(currentError);
          setState("error");
          onFinalError?.(currentError);
          return null;
        }

        // Retry
        setRetryCount(currentAttempt);
        onError?.(currentError, currentAttempt);

        const retryDelay = calculateDelay(currentAttempt);

        try {
          await wait(retryDelay);
        } catch {
          return null; // Aborted
        }
      }
    }

    return null;
  }, [maxRetries, initialDelay, retryCondition, onError, onFinalError, onSuccess, wait, calculateDelay]);

  /**
   * Réinitialise le state
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState("idle");
    setData(null);
    setError(null);
    setAttempt(0);
    setRetryCount(0);
  }, []);

  const canRetry = state === "error" && attempt <= maxRetries + 1;

  return {
    data,
    state,
    error,
    attempt,
    retryCount,
    execute,
    reset,
    isLoading: state === "loading",
    canRetry,
  };
}

/**
 * Hook pour retry avec exécution automatique au montage
 */
export function useRetryOnMount<T>(
  fn: () => Promise<T>,
  config: RetryConfig & { enabled?: boolean } = {}
): RetryResult<T> {
  const { enabled = true, ...retryConfig } = config;
  const result = useRetry(fn, retryConfig);

  useEffect(() => {
    if (enabled) {
      result.execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return result;
}

/**
 * Fonction utilitaire pour retry sans hook
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    onError,
    retryCondition,
  } = config;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Vérifier si on doit retry
      if (retryCondition && !retryCondition(error)) {
        throw error;
      }

      // Dernière tentative
      if (attempt > maxRetries) {
        throw error;
      }

      // Callback d'erreur
      onError?.(error, attempt);

      // Attendre avant retry
      const retryDelay = Math.min(
        delay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // Ne devrait jamais arriver
  throw new Error("Retry failed unexpectedly");
}

export default useRetry;
