"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { api, Trial } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface EligibilityCriteria {
  inclusion: string[];
  exclusion: string[];
  age_range?: { min: number; max: number };
  gender?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Components
// ─────────────────────────────────────────────────────────────────────────────

function InfoCard({ title, children, icon }: { title: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg text-cyan-600 dark:text-cyan-400">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EligibilitySection({ criteria }: { criteria?: EligibilityCriteria }) {
  if (!criteria) return null;

  return (
    <div className="space-y-6">
      {/* Age & Gender */}
      {(criteria.age_range || criteria.gender) && (
        <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          {criteria.age_range && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Age:</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                {criteria.age_range.min} - {criteria.age_range.max} years
              </span>
            </div>
          )}
          {criteria.gender && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Gender:</span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                {criteria.gender}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Inclusion Criteria */}
      {criteria.inclusion && criteria.inclusion.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Inclusion Criteria
          </h4>
          <ul className="space-y-2">
            {criteria.inclusion.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Exclusion Criteria */}
      {criteria.exclusion && criteria.exclusion.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Exclusion Criteria
          </h4>
          <ul className="space-y-2">
            {criteria.exclusion.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Trial Details Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TrialDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const trialId = params.id as string;

  // Fetch trial details
  const { data: trial, isLoading, error } = useQuery({
    queryKey: ["trial", trialId],
    queryFn: () => api.trials.get(trialId),
    enabled: !!trialId,
  });

  // Check eligibility mutation
  const eligibilityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/agents/orchestrate/match`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trial_id: trialId }),
        }
      );
      return response.json();
    },
  });

  // Express interest mutation
  const interestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/agents/orchestrate/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trial_id: trialId }),
        }
      );
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
              </div>
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !trial) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Trial Not Found
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            The trial you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/trials"
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Back to Trials
          </Link>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    recruiting: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    suspended: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Back Button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Trials
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[trial.status] || statusColors.active}`}>
              {trial.status.charAt(0).toUpperCase() + trial.status.slice(1)}
            </span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
              {trial.phase}
            </span>
            {trial.is_verified && (
              <span className="flex items-center gap-1 px-3 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Blockchain Verified
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {trial.title}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Sponsored by {trial.sponsor}
          </p>
          {trial.nct_id && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              NCT ID: {trial.nct_id}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <InfoCard
              title="About This Trial"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {trial.description || "No detailed description available for this trial."}
              </p>
            </InfoCard>

            {/* Conditions */}
            {trial.conditions && trial.conditions.length > 0 && (
              <InfoCard
                title="Conditions Studied"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {trial.conditions.map((condition, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                      {condition}
                    </span>
                  ))}
                </div>
              </InfoCard>
            )}

            {/* Eligibility Criteria */}
            <InfoCard
              title="Eligibility Criteria"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <EligibilitySection criteria={trial.eligibility_criteria as EligibilityCriteria} />
            </InfoCard>

            {/* Locations */}
            {trial.locations && trial.locations.length > 0 && (
              <InfoCard
                title="Trial Locations"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                <div className="space-y-3">
                  {trial.locations.map((location: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {location.facility || location.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {location.city}, {location.state || location.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Facts
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Target Enrollment</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {trial.target_enrollment || "N/A"} participants
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Study Type</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {trial.study_type || "Interventional"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Start Date</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {trial.start_date ? new Date(trial.start_date).toLocaleDateString() : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Locations</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {trial.locations?.length || 0} sites
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-2">Interested in This Trial?</h3>
              <p className="text-sm text-cyan-100 mb-4">
                Our AI agents will analyze your profile and determine your eligibility.
              </p>

              {isSignedIn ? (
                <div className="space-y-3">
                  <button
                    onClick={() => eligibilityMutation.mutate()}
                    disabled={eligibilityMutation.isPending}
                    className="w-full py-3 px-4 bg-white text-cyan-600 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {eligibilityMutation.isPending ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Check My Eligibility
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => interestMutation.mutate()}
                    disabled={interestMutation.isPending}
                    className="w-full py-3 px-4 bg-cyan-400/20 text-white font-medium rounded-lg hover:bg-cyan-400/30 transition-colors disabled:opacity-50 border border-white/30 flex items-center justify-center gap-2"
                  >
                    {interestMutation.isPending ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Express Interest
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <Link
                  href="/sign-up"
                  className="block w-full py-3 px-4 bg-white text-cyan-600 font-medium rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  Sign Up to Apply
                </Link>
              )}

              {/* Mutation Results */}
              {eligibilityMutation.isSuccess && (
                <div className="mt-4 p-3 bg-white/10 rounded-lg">
                  <p className="text-sm font-medium">Eligibility Check Complete</p>
                  <p className="text-xs text-cyan-100 mt-1">
                    Match Score: {eligibilityMutation.data?.match_score || "Calculating..."}%
                  </p>
                </div>
              )}
            </div>

            {/* Blockchain Verification */}
            {trial.is_verified && (
              <div className="bg-gray-900 dark:bg-gray-950 rounded-xl p-6 border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold">Blockchain Verified</h3>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  This trial's data integrity is verified on the blockchain.
                </p>
                <div className="text-xs font-mono text-cyan-400/70 break-all bg-black/30 p-2 rounded">
                  {trial.blockchain_hash || "0x...verified"}
                </div>
              </div>
            )}

            {/* Contact */}
            {trial.contact_info && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3 text-sm">
                  {(trial.contact_info as any).email && (
                    <a
                      href={`mailto:${(trial.contact_info as any).email}`}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {(trial.contact_info as any).email}
                    </a>
                  )}
                  {(trial.contact_info as any).phone && (
                    <a
                      href={`tel:${(trial.contact_info as any).phone}`}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {(trial.contact_info as any).phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
