/**
 * Types standardisés pour les réponses API
 * Usage: uniformiser les réponses d'erreur et de succès
 */

// Codes d'erreur métier
export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: string;
  field?: string; // Pour les erreurs de validation
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiFailure {
  success: false;
  error: ApiError;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiFailure;

// Helpers pour créer des réponses
export function success<T>(data: T, meta?: ApiSuccess<T>["meta"]): ApiSuccess<T> {
  return { success: true, data, meta };
}

export function failure(
  code: ApiErrorCode,
  message: string,
  details?: string,
  field?: string
): ApiFailure {
  return {
    success: false,
    error: { code, message, details, field },
  };
}

// Helper pour gérer les erreurs catch
export function handleError(error: unknown): ApiFailure {
  if (error instanceof Error) {
    return failure("INTERNAL_ERROR", error.message);
  }
  return failure("INTERNAL_ERROR", "Une erreur inconnue s'est produite");
}

// HTTP Status codes mapping
export const errorStatusMap: Record<ApiErrorCode, number> = {
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};
