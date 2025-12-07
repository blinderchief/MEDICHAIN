"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api, Match, PaginatedResponse } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MatchStatus = "pending" | "accepted" | "rejected" | "enrolled" | "withdrawn";

interface MatchWithTrial extends Match {
  trial?: {
    id: string;
    title: string;
    sponsor: string;
    phase: string;
    status: string;
    conditions: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Configuration
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<MatchStatus, { label: string; color: string; icon: JSX.Element }> = {
  pending: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  accepted: {
    label: "Accepted",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  rejected: {
    label: "Not Eligible",
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  enrolled: {
    label: "Enrolled",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Match Card Component
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({ 
  match, 
  onAccept, 
  onReject, 
  onWithdraw,
  isLoading 
}: { 
  match: MatchWithTrial;
  onAccept: () => void;
  onReject: () => void;
  onWithdraw: () => void;
  isLoading: boolean;
}) {
  const status = statusConfig[match.status as MatchStatus] || statusConfig.pending;
  const matchScore = match.match_score || match.matchScore || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Match Score Header */}
      <div className="relative h-2 bg-gray-100 dark:bg-gray-700">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${
            matchScore >= 80 ? "bg-green-500" : matchScore >= 60 ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${matchScore}%` }}
        />
      </div>

      <div className="p-6">
        {/* Status & Score */}
        <div className="flex items-center justify-between mb-4">
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.icon}
            {status.label}
          </span>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              matchScore >= 80 ? "text-green-600" : matchScore >= 60 ? "text-yellow-600" : "text-red-600"
            }`}>
              {matchScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Match Score</div>
          </div>
        </div>

        {/* Trial Info */}
        {match.trial ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
              {match.trial.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {match.trial.sponsor} • {match.trial.phase}
            </p>

            {/* Conditions */}
            {match.trial.conditions && match.trial.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {match.trial.conditions.slice(0, 3).map((condition, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Trial #{match.trial_id?.slice(0, 8)}...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading trial details...
            </p>
          </div>
        )}

        {/* Match Reasoning */}
        {match.reasoning && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">AI Analysis</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {match.reasoning}
            </p>
          </div>
        )}

        {/* Blockchain Consent */}
        {match.consent_hash && (
          <div className="mb-4 flex items-center gap-2 text-xs text-cyan-600 dark:text-cyan-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Consent verified on blockchain</span>
          </div>
        )}

        {/* Created Date */}
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          Matched on {new Date(match.created_at).toLocaleDateString()}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {match.status === "pending" && (
            <>
              <button
                onClick={onAccept}
                disabled={isLoading}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Accept
                  </>
                )}
              </button>
              <button
                onClick={onReject}
                disabled={isLoading}
                className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </>
          )}

          {(match.status === "accepted" || match.status === "enrolled") && (
            <>
              <Link
                href={`/trials/${match.trial_id}`}
                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors text-center"
              >
                View Trial
              </Link>
              <button
                onClick={onWithdraw}
                disabled={isLoading}
                className="py-2.5 px-4 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Withdraw
              </button>
            </>
          )}

          {match.status === "rejected" && (
            <Link
              href="/trials"
              className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors text-center"
            >
              Find Other Trials
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Matches Page
// ─────────────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<MatchStatus | "all">("all");
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);

  // Fetch matches
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["matches", activeFilter],
    queryFn: async () => {
      const token = await getToken();
      const params: Record<string, string | number> = { limit: 50 };
      if (activeFilter !== "all") params.status = activeFilter;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/matches?${new URLSearchParams(params as any)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.json() as Promise<PaginatedResponse<MatchWithTrial>>;
    },
    enabled: isLoaded && isSignedIn,
  });

  // Update match status mutation
  const updateMatchMutation = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: MatchStatus }) => {
      setLoadingMatchId(matchId);
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/matches/${matchId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      setLoadingMatchId(null);
    },
    onError: () => {
      setLoadingMatchId(null);
    },
  });

  // Find new matches mutation
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
          body: JSON.stringify({}),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
  });

  const matches = data?.items || [];
  const filteredMatches = activeFilter === "all" 
    ? matches 
    : matches.filter(m => m.status === activeFilter);

  // Stats
  const stats = {
    total: matches.length,
    pending: matches.filter(m => m.status === "pending").length,
    accepted: matches.filter(m => m.status === "accepted").length,
    enrolled: matches.filter(m => m.status === "enrolled").length,
    avgScore: matches.length > 0 
      ? Math.round(matches.reduce((acc, m) => acc + (m.match_score || m.matchScore || 0), 0) / matches.length)
      : 0,
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-cyan-100 dark:bg-cyan-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In Required
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please sign in to view your trial matches.
          </p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                My Matches
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered trial recommendations based on your profile
              </p>
            </div>
            
            <button
              onClick={() => findMatchesMutation.mutate()}
              disabled={findMatchesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
            >
              {findMatchesMutation.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Finding Matches...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find New Matches
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Matches</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Accepted</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Enrolled</p>
            <p className="text-2xl font-bold text-blue-600">{stats.enrolled}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Score</p>
            <p className="text-2xl font-bold text-cyan-600">{stats.avgScore}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "pending", "accepted", "enrolled", "rejected", "withdrawn"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeFilter === filter
                  ? "bg-cyan-500 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter !== "all" && (
                <span className="ml-1.5 text-xs">
                  ({matches.filter(m => m.status === filter).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Matches Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
                <div className="flex justify-between mb-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Matches</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Please try again or contact support.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-600"
            >
              Retry
            </button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {activeFilter === "all" ? "No Matches Yet" : `No ${activeFilter} Matches`}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {activeFilter === "all" 
                ? "Complete your profile and our AI agents will find matching trials for you."
                : `You don't have any matches in the "${activeFilter}" status.`
              }
            </p>
            {activeFilter === "all" && (
              <div className="flex gap-4 justify-center">
                <Link
                  href="/profile"
                  className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                >
                  Complete Profile
                </Link>
                <Link
                  href="/trials"
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Browse Trials
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onAccept={() => updateMatchMutation.mutate({ matchId: match.id, status: "accepted" })}
                onReject={() => updateMatchMutation.mutate({ matchId: match.id, status: "rejected" })}
                onWithdraw={() => updateMatchMutation.mutate({ matchId: match.id, status: "withdrawn" })}
                isLoading={loadingMatchId === match.id}
              />
            ))}
          </div>
        )}

        {/* How It Works */}
        {matches.length > 0 && (
          <div className="mt-12 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/5 dark:to-blue-500/5 rounded-2xl p-8 border border-cyan-500/20">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              How AI Matching Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  title: "Profile Analysis",
                  description: "Our Patient Agent analyzes your medical history and preferences",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                },
                {
                  step: 2,
                  title: "Trial Matching",
                  description: "Matcher Agent compares your profile against eligibility criteria",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                },
                {
                  step: 3,
                  title: "Consent & Verification",
                  description: "Consent Agent ensures HIPAA compliance and blockchain verification",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                },
                {
                  step: 4,
                  title: "Enrollment",
                  description: "Get connected with trial coordinators and earn ASI token rewards",
                  icon: (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 bg-cyan-500 text-white rounded-full flex items-center justify-center mx-auto mb-3">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
