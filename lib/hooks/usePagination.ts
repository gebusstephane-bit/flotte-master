/**
 * Hook de pagination universel pour FleetFlow
 * 
 * Usage:
 * const { data, page, totalPages, loading, nextPage, prevPage, refresh } = 
 *   usePagination((page) => fetchVehicles(page));
 */

import { useState, useCallback, useEffect } from "react";

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

interface UsePaginationOptions {
  initialPage?: number;
  autoLoad?: boolean;
}

export function usePagination<T>(
  fetcher: (page: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginationOptions = {}
) {
  const { initialPage = 1, autoLoad = true } = options;
  
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (pageNum: number) => {
      if (pageNum < 1) return;
      if (totalPages && pageNum > totalPages) return;

      setLoading(true);
      setError(null);

      try {
        const result = await fetcher(pageNum);
        setData(result.data);
        setPage(result.pagination.page);
        setPerPage(result.pagination.per_page);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.total_pages);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de chargement";
        setError(message);
        console.error("[usePagination] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [fetcher, totalPages]
  );

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      loadPage(page + 1);
    }
  }, [page, totalPages, loadPage]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      loadPage(page - 1);
    }
  }, [page, loadPage]);

  const goToPage = useCallback(
    (pageNum: number) => {
      loadPage(pageNum);
    },
    [loadPage]
  );

  const refresh = useCallback(() => {
    loadPage(page);
  }, [page, loadPage]);

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadPage(initialPage);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    data,
    loading,
    error,
    
    // Pagination
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    
    // Actions
    nextPage,
    prevPage,
    goToPage,
    refresh,
    loadPage,
  };
}

/**
 * Hook pour la recherche + pagination combinée
 */
export function useSearchPagination<T>(
  fetcher: (page: number, search: string) => Promise<PaginatedResponse<T>>,
  options: UsePaginationOptions = {}
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchWithSearch = useCallback(
    (page: number) => fetcher(page, debouncedSearch),
    [fetcher, debouncedSearch]
  );

  const pagination = usePagination(fetchWithSearch, {
    ...options,
    autoLoad: false, // On va gérer le chargement nous-mêmes
  });

  // Recharger quand la recherche change
  useEffect(() => {
    pagination.loadPage(1);
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...pagination,
    searchQuery,
    setSearchQuery,
  };
}
