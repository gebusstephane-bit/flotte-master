"use client";

import { useState, useMemo, useCallback } from "react";

export interface SortConfig<T> {
  key: keyof T | null;
  direction: "asc" | "desc";
}

export interface UseSortReturn<T> {
  sortedData: T[];
  sortConfig: SortConfig<T>;
  requestSort: (key: keyof T) => void;
  getSortIndicator: (key: keyof T) => "asc" | "desc" | null;
}

export function useSort<T>(
  data: T[],
  defaultSort?: { key: keyof T; direction: "asc" | "desc" }
): UseSortReturn<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: defaultSort?.key ?? null,
    direction: defaultSort?.direction ?? "asc",
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const { key, direction } = sortConfig;

    return [...data].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      // Gestion des valeurs null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return direction === "asc" ? 1 : -1;
      if (bValue == null) return direction === "asc" ? -1 : 1;

      // Comparaison selon le type
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, "fr", {
          sensitivity: "base",
        });
        return direction === "asc" ? comparison : -comparison;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return direction === "asc"
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Fallback: conversion string
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr, "fr", {
        sensitivity: "base",
      });
      return direction === "asc" ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const requestSort = useCallback(
    (key: keyof T) => {
      setSortConfig((current) => ({
        key,
        direction:
          current.key === key && current.direction === "asc" ? "desc" : "asc",
      }));
    },
    [setSortConfig]
  );

  const getSortIndicator = useCallback(
    (key: keyof T): "asc" | "desc" | null => {
      if (sortConfig.key !== key) return null;
      return sortConfig.direction;
    },
    [sortConfig]
  );

  return {
    sortedData,
    sortConfig,
    requestSort,
    getSortIndicator,
  };
}
