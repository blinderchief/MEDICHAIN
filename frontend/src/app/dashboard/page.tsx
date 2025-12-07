'use client';

import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { 
  Activity, 
  Bell, 
  Calendar, 
  ChevronRight,
  FileText, 
  Heart, 
  Search, 
  Shield, 
  TrendingUp,
  Users,
  Wallet,
  Zap,
  Sparkles,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Star
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-medichain-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  const firstName = user?.firstName || 'there';

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
            <span className="text-3xl">👋</span>
          </div>
          <p className="text-muted-foreground text-lg">
            Here&apos;s an overview of your clinical trial matching journey.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[
            { 
              label: 'Active Matches', 
              value: '8', 
              change: '+2 this week',
              icon: Heart,
              color: 'text-pink-500',
              bg: 'from-pink-500/10 to-rose-500/10',
              borderColor: 'border-pink-200 dark:border-pink-900/50',
            },
            { 
              label: 'Profile Score', 
              value: '94%', 
              change: 'Excellent',
              icon: Shield,
              color: 'text-emerald-500',
              bg: 'from-emerald-500/10 to-teal-500/10',
              borderColor: 'border-emerald-200 dark:border-emerald-900/50',
            },
            { 
              label: 'ASI Earned', 
              value: '125', 
              change: '+15 pending',
              icon: Wallet,
              color: 'text-medichain-500',
              bg: 'from-medichain-500/10 to-cyan-500/10',
              borderColor: 'border-medichain-200 dark:border-medichain-900/50',
            },
            { 
              label: 'Next Update', 
              value: '7 days', 
              change: 'Auto-matching enabled',
              icon: Calendar,
              color: 'text-purple-500',
              bg: 'from-purple-500/10 to-indigo-500/10',
              borderColor: 'border-purple-200 dark:border-purple-900/50',
            },
          ].map((stat) => (
            <div 
              key={stat.label} 
              className={`relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br ${stat.bg} border ${stat.borderColor} card-hover`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-white dark:bg-slate-900 shadow-md flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Matches */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Top Matches for You</h2>
                    <p className="text-sm text-muted-foreground">AI-powered recommendations</p>
                  </div>
                </div>
                <Link 
                  href="/dashboard/matches"
                  className="flex items-center gap-1 text-sm text-medichain-600 hover:text-medichain-700 font-medium group"
                >
                  View All
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              
              <div className="space-y-3">
                {[
                  {
                    title: 'Phase 3 Diabetes Treatment Study',
                    sponsor: 'Novo Nordisk',
                    confidence: 96,
                    location: 'Boston, MA',
                    reward: 50,
                    phase: 'Phase III',
                  },
                  {
                    title: 'Cardiovascular Prevention Trial',
                    sponsor: 'Mayo Clinic',
                    confidence: 89,
                    location: 'Rochester, MN',
                    reward: 35,
                    phase: 'Phase II',
                  },
                  {
                    title: 'Mental Health Intervention Study',
                    sponsor: 'NIH',
                    confidence: 84,
                    location: 'Remote',
                    reward: 25,
                    phase: 'Phase IV',
                  },
                ].map((match, index) => (
                  <div 
                    key={index}
                    className="group flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-medichain-200 dark:hover:border-medichain-800 transition-all cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold group-hover:text-medichain-600 transition-colors">{match.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
                          {match.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{match.sponsor}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        <span>{match.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${
                          match.confidence >= 90 ? 'text-emerald-500' : 
                          match.confidence >= 80 ? 'text-amber-500' : 'text-orange-500'
                        }`}>
                          {match.confidence}%
                        </div>
                        <div className="text-xs text-muted-foreground">Match Score</div>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-medichain-100 dark:bg-medichain-900/40 text-medichain-700 dark:text-medichain-300 text-sm font-semibold">
                        <Zap className="w-3.5 h-3.5" />
                        {match.reward} ASI
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <p className="text-sm text-muted-foreground">Your latest updates</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    action: 'Profile updated',
                    detail: 'Lab results from Dr. Smith added',
                    time: '2 hours ago',
                    icon: FileText,
                    color: 'text-blue-500',
                    bg: 'bg-blue-100 dark:bg-blue-900/40',
                  },
                  {
                    action: 'New match found',
                    detail: 'Phase 2 Immunology Trial (92% match)',
                    time: '5 hours ago',
                    icon: Sparkles,
                    color: 'text-amber-500',
                    bg: 'bg-amber-100 dark:bg-amber-900/40',
                  },
                  {
                    action: 'ASI Reward received',
                    detail: '15 ASI for profile completion',
                    time: '1 day ago',
                    icon: Wallet,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
                  },
                  {
                    action: 'Consent verified',
                    detail: 'On-chain verification complete',
                    time: '2 days ago',
                    icon: Shield,
                    color: 'text-purple-500',
                    bg: 'bg-purple-100 dark:bg-purple-900/40',
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${activity.bg} flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className={`w-5 h-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              
              <div className="space-y-2">
                {[
                  {
                    href: '/dashboard/profile',
                    icon: Users,
                    color: 'text-blue-500',
                    bg: 'bg-blue-100 dark:bg-blue-900/40',
                    title: 'Update Profile',
                    desc: 'Add new health info',
                  },
                  {
                    href: '/dashboard/trials',
                    icon: Search,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
                    title: 'Browse Trials',
                    desc: 'Explore 50,000+ trials',
                  },
                  {
                    href: '/dashboard/matches',
                    icon: Heart,
                    color: 'text-pink-500',
                    bg: 'bg-pink-100 dark:bg-pink-900/40',
                    title: 'Find Matches',
                    desc: 'AI-powered matching',
                  },
                ].map((action) => (
                  <Link 
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${action.bg} flex items-center justify-center`}>
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium group-hover:text-medichain-600 transition-colors">{action.title}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Profile Completion */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Profile Completion</h2>
                <span className="badge-success">
                  <CheckCircle2 className="w-3 h-3" />
                  94%
                </span>
              </div>
              
              <div className="mb-4">
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                    style={{ width: '94%' }}
                  />
                </div>
              </div>
              
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Basic information', done: true },
                  { label: 'Medical conditions', done: true },
                  { label: 'Lab results', done: true },
                  { label: 'Genetic data (optional)', done: false },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2.5 ${item.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.done 
                        ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      {item.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rewards Card */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-medichain-600 via-medichain-700 to-blue-800 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5" />
                  <h2 className="text-lg font-semibold">ASI Rewards</h2>
                </div>
                
                <div className="mb-6">
                  <div className="text-4xl font-bold mb-1">125 ASI</div>
                  <div className="text-white/70 text-sm">≈ $187.50 USD</div>
                </div>
                
                <div className="space-y-2.5 text-sm mb-6">
                  {[
                    { label: 'Profile completion', value: '+15 ASI' },
                    { label: 'Trial enrollment', value: '+50 ASI' },
                    { label: 'Data contribution', value: '+60 ASI' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-white/80">
                      <span>{item.label}</span>
                      <span className="font-medium text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
                
                <button className="w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition text-sm font-semibold backdrop-blur">
                  View Reward History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
