"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Match, PaginatedResponse } from "@/lib/api";

type MatchStatus = "pending" | "accepted" | "rejected" | "enrolled" | "withdrawn";

interface UseMatchesParams {
  status?: MatchStatus;
  page?: number;
  limit?: number;
}

/**
 * Hook for fetching and managing trial matches
 */
export function useMatches(params: UseMatchesParams = {}) {
  const { status, page = 1, limit = 50 } = params;
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["matches", { status, page, limit }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const token = await getToken();
      const queryParams: Record<string, string | number> = { page, limit };
      if (status) queryParams.status = status;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/matches?${new URLSearchParams(queryParams as any)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch matches");
      return response.json() as Promise<PaginatedResponse<Match>>;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update match status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ matchId, newStatus }: { matchId: string; newStatus: MatchStatus }) => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/matches/${matchId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!response.ok) throw new Error("Failed to update match status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  // Find new matches using AI
  const findMatchesMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/agents/orchestrate/match`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to find matches");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  // Accept a match
  const acceptMatch = (matchId: string) => {
    updateStatusMutation.mutate({ matchId, newStatus: "accepted" });
  };

  // Reject a match
  const rejectMatch = (matchId: string) => {
    updateStatusMutation.mutate({ matchId, newStatus: "rejected" });
  };

  // Withdraw from a match
  const withdrawMatch = (matchId: string) => {
    updateStatusMutation.mutate({ matchId, newStatus: "withdrawn" });
  };

  // Calculate stats
  const matches = query.data?.items || [];
  const stats = {
    total: matches.length,
    pending: matches.filter((m) => m.status === "pending").length,
    accepted: matches.filter((m) => m.status === "accepted").length,
    enrolled: matches.filter((m) => m.status === "enrolled").length,
    rejected: matches.filter((m) => m.status === "rejected").length,
    avgScore:
      matches.length > 0
        ? Math.round(matches.reduce((acc, m) => acc + (m.match_score || m.matchScore || 0), 0) / matches.length)
        : 0,
  };

  return {
    matches,
    stats,
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    acceptMatch,
    rejectMatch,
    withdrawMatch,
    findMatches: findMatchesMutation.mutate,
    isFindingMatches: findMatchesMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
  };
}

/**
 * Hook for fetching a single match by ID
 */
export function useMatch(matchId: string | undefined) {
  const { getToken } = useAuth();

  const query = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/matches/${matchId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch match");
      return response.json() as Promise<Match>;
    },
    enabled: !!matchId,
  });

  return {
    match: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
