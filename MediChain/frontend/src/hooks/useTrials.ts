"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { api, Trial, PaginatedResponse } from "@/lib/api";

interface UseTrialsParams {
  page?: number;
  limit?: number;
  search?: string;
  phase?: string;
  status?: string;
  therapeutic_area?: string;
}

/**
 * Hook for fetching and managing clinical trials
 */
export function useTrials(params: UseTrialsParams = {}) {
  const { page = 1, limit = 12, search, phase, status, therapeutic_area } = params;

  const queryKey = ["trials", { page, limit, search, phase, status, therapeutic_area }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const queryParams: Record<string, string | number> = { page, limit };
      if (search) queryParams.search = search;
      if (phase) queryParams.phase = phase;
      if (status) queryParams.status = status;
      if (therapeutic_area) queryParams.therapeutic_area = therapeutic_area;
      
      return api.trials.list(queryParams);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });

  return {
    trials: query.data?.items || [],
    total: query.data?.total || 0,
    totalPages: query.data?.pages || 1,
    currentPage: query.data?.page || 1,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook for fetching a single trial by ID
 */
export function useTrial(trialId: string | undefined) {
  const query = useQuery({
    queryKey: ["trial", trialId],
    queryFn: () => api.trials.get(trialId!),
    enabled: !!trialId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    trial: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook for syncing trials from ClinicalTrials.gov
 */
export function useSyncTrials() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conditions?: string[]) => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/trials/sync`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ conditions }),
        }
      );
      if (!response.ok) throw new Error("Failed to sync trials");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
    },
  });
}
