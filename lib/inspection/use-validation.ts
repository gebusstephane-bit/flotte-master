"use client";

/**
 * Hook pour la gestion de la validation des inspections
 * Fournit l'état et les fonctions nécessaires pour le workflow de validation
 */

import { useState, useCallback } from "react";
import { useUser } from "@/lib/hooks/use-auth";

interface UseValidationOptions {
  onSuccess?: () => void;
}

interface ValidationState {
  selectedInspectionId: string | null;
  selectedInspectionStatus: string;
  hasDefects: boolean;
  isModalOpen: boolean;
}

export function useValidation(options: UseValidationOptions = {}) {
  const { user } = useUser();
  const [state, setState] = useState<ValidationState>({
    selectedInspectionId: null,
    selectedInspectionStatus: "",
    hasDefects: false,
    isModalOpen: false,
  });

  // Ouvrir le modal pour une inspection
  const openValidationModal = useCallback((
    inspectionId: string,
    status: string,
    defectsCount: number = 0
  ) => {
    setState({
      selectedInspectionId: inspectionId,
      selectedInspectionStatus: status,
      hasDefects: defectsCount > 0,
      isModalOpen: true,
    });
  }, []);

  // Fermer le modal
  const closeValidationModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isModalOpen: false,
    }));
  }, []);

  // Gestion du succès
  const handleValidationSuccess = useCallback(() => {
    closeValidationModal();
    options.onSuccess?.();
  }, [closeValidationModal, options.onSuccess]);

  // Vérifier si une inspection est validable
  const isInspectionValidatable = useCallback((status: string): boolean => {
    return ["pending_review", "requires_action"].includes(status);
  }, []);

  // Déterminer si le bouton doit être affiché (rôle + statut)
  const shouldShowValidationButton = useCallback((
    status: string,
    userCanValidate: boolean
  ): boolean => {
    return userCanValidate && isInspectionValidatable(status);
  }, [isInspectionValidatable]);

  return {
    // État
    ...state,
    userName: user?.user_metadata?.name as string | undefined,
    
    // Actions
    openValidationModal,
    closeValidationModal,
    handleValidationSuccess,
    
    // Helpers
    isInspectionValidatable,
    shouldShowValidationButton,
  };
}
