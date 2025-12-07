'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar,
  Users,
  Sparkles,
  SlidersHorizontal,
  X,
  ChevronDown
} from 'lucide-react';
import { TrialCard } from '@/components/TrialCard';

// Mock trial data
const mockTrials = [
  {
    id: '1',
    title: 'Phase 3 Study of Novel GLP-1 Agonist for Type 2 Diabetes',
    sponsor: 'Novo Nordisk',
    phase: 'Phase III' as const,
    status: 'recruiting' as const,
    condition: 'Type 2 Diabetes',
    location: 'Boston, MA',
    targetEnrollment: 500,
    currentEnrollment: 342,
    startDate: '2024-06-15',
    briefDescription: 'A randomized, double-blind study evaluating the efficacy and safety of a novel GLP-1 receptor agonist in patients with inadequately controlled type 2 diabetes.',
    compensation: '50 ASI per visit',
    matchScore: 96,
    eligibilitySummary: ['Adults 18-75 years', 'HbA1c 7.0-10.5%', 'BMI 25-45 kg/m²'],
  },
  {
    id: '2',
    title: 'Cardiovascular Outcomes Trial for Heart Failure Patients',
    sponsor: 'Mayo Clinic',
    phase: 'Phase II' as const,
    status: 'recruiting' as const,
    condition: 'Heart Failure',
    location: 'Rochester, MN',
    targetEnrollment: 300,
    currentEnrollment: 156,
    startDate: '2024-08-01',
    briefDescription: 'Investigating the cardiovascular benefits of a new therapeutic approach in patients with chronic heart failure with reduced ejection fraction.',
    compensation: '35 ASI per visit',
    matchScore: 89,
    eligibilitySummary: ['LVEF ≤40%', 'NYHA Class II-III', 'Stable on guideline therapy'],
  },
  {
    id: '3',
    title: 'Digital Cognitive Behavioral Therapy for Depression',
    sponsor: 'NIH / Stanford',
    phase: 'Phase IV' as const,
    status: 'recruiting' as const,
    condition: 'Major Depression',
    location: 'Remote',
    targetEnrollment: 1000,
    currentEnrollment: 723,
    startDate: '2024-03-01',
    briefDescription: 'Evaluating the effectiveness of an AI-powered digital CBT platform compared to traditional therapy for moderate depression.',
    compensation: '25 ASI per session',
    matchScore: 84,
    eligibilitySummary: ['PHQ-9 score 10-19', 'No active suicidal ideation', 'Internet access required'],
  },
  {
    id: '4',
    title: 'Immunotherapy Combination for Advanced Melanoma',
    sponsor: 'Memorial Sloan Kettering',
    phase: 'Phase I' as const,
    status: 'recruiting' as const,
    condition: 'Melanoma',
    location: 'New York, NY',
    targetEnrollment: 60,
    currentEnrollment: 28,
    startDate: '2024-09-15',
    briefDescription: 'First-in-human study of a novel immune checkpoint inhibitor combination in patients with unresectable or metastatic melanoma.',
    compensation: '100 ASI per cycle',
    eligibilitySummary: ['Stage III/IV melanoma', 'ECOG 0-1', 'Prior PD-1 therapy allowed'],
  },
  {
    id: '5',
    title: 'Gene Therapy for Inherited Retinal Dystrophy',
    sponsor: 'Spark Therapeutics',
    phase: 'Phase II' as const,
    status: 'active' as const,
    condition: 'Retinal Dystrophy',
    location: 'Philadelphia, PA',
    targetEnrollment: 40,
    currentEnrollment: 40,
    startDate: '2023-11-01',
    briefDescription: 'Single-dose gene therapy administration for patients with confirmed biallelic RPE65 mutation-associated retinal dystrophy.',
    compensation: '150 ASI total',
    eligibilitySummary: ['Confirmed RPE65 mutation', 'Visual acuity ≤20/60', 'Age 3+ years'],
  },
  {
    id: '6',
    title: 'Microbiome Modulation for Inflammatory Bowel Disease',
    sponsor: 'Cleveland Clinic',
    phase: 'Phase II' as const,
    status: 'recruiting' as const,
    condition: 'Ulcerative Colitis',
    location: 'Cleveland, OH',
    targetEnrollment: 200,
    currentEnrollment: 89,
    startDate: '2024-07-01',
    briefDescription: 'Investigating the efficacy of a targeted microbiome therapeutic in patients with moderate-to-severe ulcerative colitis.',
    compensation: '40 ASI per visit',
    matchScore: 78,
    eligibilitySummary: ['Active UC (Mayo score 6-12)', 'Failed ≥1 biologic', 'No C. diff in 60 days'],
  },
];

const phases = ['All Phases', 'Phase I', 'Phase II', 'Phase III', 'Phase IV'];
const statuses = ['All Status', 'Recruiting', 'Active', 'Completed'];
const conditions = ['All Conditions', 'Diabetes', 'Heart Failure', 'Depression', 'Oncology', 'Rare Disease', 'GI Disorders'];

export default function TrialsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('All Phases');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [showFilters, setShowFilters] = useState(false);

  const filteredTrials = mockTrials.filter(trial => {
    const matchesSearch = trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trial.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         trial.condition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = selectedPhase === 'All Phases' || trial.phase === selectedPhase;
    const matchesStatus = selectedStatus === 'All Status' || 
                         trial.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesPhase && matchesStatus;
  });

  const activeFiltersCount = [selectedPhase, selectedStatus, selectedCondition]
    .filter(f => !f.startsWith('All')).length;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Clinical Trials</h1>
          <p className="text-muted-foreground text-lg">
            Explore over 50,000 clinical trials and find the perfect match for you.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search trials by name, sponsor, or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-medichain-500 focus:border-transparent transition"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-5 rounded-xl border flex items-center gap-2 font-medium transition ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-medichain-50 border-medichain-200 text-medichain-700 dark:bg-medichain-900/30 dark:border-medichain-800 dark:text-medichain-300'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-medichain-500 text-white text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Filter Trials</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedPhase('All Phases');
                      setSelectedStatus('All Status');
                      setSelectedCondition('All Conditions');
                    }}
                    className="text-sm text-medichain-600 hover:text-medichain-700 font-medium"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Phase Filter */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Phase</label>
                  <div className="relative">
                    <select
                      value={selectedPhase}
                      onChange={(e) => setSelectedPhase(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-medichain-500"
                    >
                      {phases.map(phase => (
                        <option key={phase} value={phase}>{phase}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                  <div className="relative">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-medichain-500"
                    >
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Condition</label>
                  <div className="relative">
                    <select
                      value={selectedCondition}
                      onChange={(e) => setSelectedCondition(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-medichain-500"
                    >
                      {conditions.map(condition => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredTrials.length}</span> trials
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-medichain-500" />
            <span className="text-muted-foreground">AI-matched trials shown first</span>
          </div>
        </div>

        {/* Trials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrials.map((trial) => (
            <TrialCard 
              key={trial.id} 
              trial={trial} 
              showMatchScore={!!trial.matchScore}
              onEnroll={(id) => console.log('Enroll in trial:', id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredTrials.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No trials found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find more trials.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedPhase('All Phases');
                setSelectedStatus('All Status');
                setSelectedCondition('All Conditions');
              }}
              className="text-medichain-600 hover:text-medichain-700 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
