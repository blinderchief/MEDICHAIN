'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  Heart, 
  Filter, 
  Sparkles, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';

// Mock match data
const mockMatches = [
  {
    id: 'm1',
    trialId: '1',
    trialTitle: 'Phase 3 Study of Novel GLP-1 Agonist for Type 2 Diabetes',
    trialPhase: 'III',
    sponsor: 'Novo Nordisk',
    location: 'Boston, MA',
    matchScore: 96,
    status: 'pending' as const,
    matchedAt: '2024-12-01T10:30:00Z',
    eligibilityFactors: [
      { factor: 'Age Range', status: 'met' as const },
      { factor: 'HbA1c Level', status: 'met' as const },
      { factor: 'BMI', status: 'met' as const },
      { factor: 'No Insulin Use', status: 'met' as const },
      { factor: 'Kidney Function', status: 'partial' as const },
    ],
    aiInsights: 'Based on your recent lab results showing HbA1c of 8.2% and your preference for once-weekly medications, this trial offers an excellent match. The study site is within 15 miles of your location.',
    estimatedDuration: '52 weeks',
    compensation: '50 ASI/visit',
  },
  {
    id: 'm2',
    trialId: '2',
    trialTitle: 'Cardiovascular Outcomes Trial for Heart Failure Patients',
    trialPhase: 'II',
    sponsor: 'Mayo Clinic',
    location: 'Rochester, MN',
    matchScore: 89,
    status: 'pending' as const,
    matchedAt: '2024-11-28T14:15:00Z',
    eligibilityFactors: [
      { factor: 'Heart Condition', status: 'met' as const },
      { factor: 'LVEF', status: 'met' as const },
      { factor: 'Current Medications', status: 'met' as const },
      { factor: 'No Recent Hospitalization', status: 'partial' as const },
    ],
    aiInsights: 'Your echocardiogram results indicate you meet the ejection fraction criteria. This trial offers cutting-edge therapy with comprehensive cardiac monitoring.',
    estimatedDuration: '24 months',
    compensation: '35 ASI/visit',
  },
  {
    id: 'm3',
    trialId: '3',
    trialTitle: 'Digital Cognitive Behavioral Therapy for Depression',
    trialPhase: 'IV',
    sponsor: 'NIH / Stanford',
    location: 'Remote',
    matchScore: 84,
    status: 'consented' as const,
    matchedAt: '2024-11-20T09:00:00Z',
    eligibilityFactors: [
      { factor: 'PHQ-9 Score', status: 'met' as const },
      { factor: 'No Active Psychosis', status: 'met' as const },
      { factor: 'Internet Access', status: 'met' as const },
      { factor: 'English Fluency', status: 'met' as const },
    ],
    aiInsights: 'This fully remote trial aligns with your preference for flexible scheduling. The AI-powered CBT platform has shown promising results in preliminary studies.',
    estimatedDuration: '12 weeks',
    compensation: '25 ASI/session',
  },
  {
    id: 'm4',
    trialId: '6',
    trialTitle: 'Microbiome Modulation for Inflammatory Bowel Disease',
    trialPhase: 'II',
    sponsor: 'Cleveland Clinic',
    location: 'Cleveland, OH',
    matchScore: 78,
    status: 'declined' as const,
    matchedAt: '2024-11-15T11:30:00Z',
    eligibilityFactors: [
      { factor: 'UC Diagnosis', status: 'met' as const },
      { factor: 'Disease Activity', status: 'met' as const },
      { factor: 'Prior Biologic Use', status: 'unmet' as const },
      { factor: 'Travel Ability', status: 'partial' as const },
    ],
    estimatedDuration: '16 weeks',
    compensation: '40 ASI/visit',
  },
];

const statusFilters = [
  { value: 'all', label: 'All Matches', icon: Heart },
  { value: 'pending', label: 'Pending Review', icon: Clock },
  { value: 'consented', label: 'Consented', icon: CheckCircle2 },
  { value: 'enrolled', label: 'Enrolled', icon: TrendingUp },
  { value: 'declined', label: 'Declined', icon: AlertCircle },
];

export default function MatchesPage() {
  const { isLoaded } = useUser();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-medichain-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading your matches...</span>
        </div>
      </div>
    );
  }

  const filteredMatches = mockMatches
    .filter(match => statusFilter === 'all' || match.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'score') return b.matchScore - a.matchScore;
      if (sortBy === 'date') return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
      return 0;
    });

  const pendingCount = mockMatches.filter(m => m.status === 'pending').length;
  const consentedCount = mockMatches.filter(m => m.status === 'consented').length;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">My Matches</h1>
              <p className="text-muted-foreground">
                AI-powered trial recommendations based on your health profile
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{consentedCount}</p>
                <p className="text-sm text-muted-foreground">Consented</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-medichain-100 dark:bg-medichain-900/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-medichain-600 dark:text-medichain-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{mockMatches.length}</p>
                <p className="text-sm text-muted-foreground">Total Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {statusFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    isActive
                      ? 'bg-medichain-100 dark:bg-medichain-900/40 text-medichain-700 dark:text-medichain-300 border border-medichain-200 dark:border-medichain-800'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 pl-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-medichain-500 text-sm"
              >
                <option value="score">Match Score</option>
                <option value="date">Date Matched</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Matches Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onConsent={(id) => console.log('Consent for match:', id)}
              onDecline={(id) => console.log('Decline match:', id)}
              onViewDetails={(id) => console.log('View details:', id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all' 
                ? "Complete your health profile to receive AI-powered trial matches."
                : "No matches with this status. Try selecting a different filter."}
            </p>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-medichain-600 hover:text-medichain-700 font-medium"
              >
                View all matches
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
