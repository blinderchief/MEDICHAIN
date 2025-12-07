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
  Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-medichain-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const firstName = user?.firstName || 'there';

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}! 👋</h1>
          <p className="text-muted-foreground">
            Here's an overview of your clinical trial matching journey.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Active Matches', 
              value: '8', 
              change: '+2 this week',
              icon: Heart,
              color: 'text-pink-500',
              bg: 'bg-pink-100 dark:bg-pink-900/30',
            },
            { 
              label: 'Profile Score', 
              value: '94%', 
              change: 'Excellent',
              icon: Shield,
              color: 'text-green-500',
              bg: 'bg-green-100 dark:bg-green-900/30',
            },
            { 
              label: 'ASI Earned', 
              value: '125', 
              change: '+15 pending',
              icon: Wallet,
              color: 'text-medichain-500',
              bg: 'bg-medichain-100 dark:bg-medichain-900/30',
            },
            { 
              label: 'Days to Next Check', 
              value: '7', 
              change: 'Auto-matching',
              icon: Calendar,
              color: 'text-purple-500',
              bg: 'bg-purple-100 dark:bg-purple-900/30',
            },
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-2xl bg-background border card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xs text-green-600 mt-2">{stat.change}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Matches */}
            <div className="p-6 rounded-2xl bg-background border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Top Matches for You</h2>
                <Link 
                  href="/dashboard/matches"
                  className="text-sm text-medichain-600 hover:text-medichain-700 flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    title: 'Phase 3 Diabetes Treatment Study',
                    sponsor: 'Novo Nordisk',
                    confidence: 96,
                    location: 'Boston, MA',
                    reward: 50,
                  },
                  {
                    title: 'Cardiovascular Prevention Trial',
                    sponsor: 'Mayo Clinic',
                    confidence: 89,
                    location: 'Rochester, MN',
                    reward: 35,
                  },
                  {
                    title: 'Mental Health Intervention Study',
                    sponsor: 'NIH',
                    confidence: 84,
                    location: 'Remote',
                    reward: 25,
                  },
                ].map((match, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition cursor-pointer"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{match.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{match.sponsor}</span>
                        <span>•</span>
                        <span>{match.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          match.confidence >= 90 ? 'text-green-500' : 
                          match.confidence >= 80 ? 'text-yellow-500' : 'text-orange-500'
                        }`}>
                          {match.confidence}%
                        </div>
                        <div className="text-xs text-muted-foreground">Match</div>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-medichain-100 dark:bg-medichain-900/30 text-medichain-700 dark:text-medichain-300 text-sm font-medium">
                        <Zap className="w-3 h-3" />
                        {match.reward} ASI
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 rounded-2xl bg-background border">
              <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
              
              <div className="space-y-4">
                {[
                  {
                    action: 'Profile updated',
                    detail: 'Lab results from Dr. Smith added',
                    time: '2 hours ago',
                    icon: FileText,
                  },
                  {
                    action: 'New match found',
                    detail: 'Phase 2 Immunology Trial (92% match)',
                    time: '5 hours ago',
                    icon: Search,
                  },
                  {
                    action: 'ASI Reward received',
                    detail: '15 ASI for profile completion',
                    time: '1 day ago',
                    icon: Wallet,
                  },
                  {
                    action: 'Consent verified',
                    detail: 'On-chain verification complete',
                    time: '2 days ago',
                    icon: Shield,
                  },
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <activity.icon className="w-5 h-5 text-muted-foreground" />
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
            <div className="p-6 rounded-2xl bg-background border">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              
              <div className="space-y-3">
                <Link 
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Update Profile</p>
                    <p className="text-xs text-muted-foreground">Add new health info</p>
                  </div>
                </Link>
                
                <Link 
                  href="/dashboard/trials"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Search className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Browse Trials</p>
                    <p className="text-xs text-muted-foreground">Explore 50,000+ trials</p>
                  </div>
                </Link>
                
                <Link 
                  href="/dashboard/matches"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">Find Matches</p>
                    <p className="text-xs text-muted-foreground">AI-powered matching</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="p-6 rounded-2xl bg-background border">
              <h2 className="text-lg font-semibold mb-4">Profile Completion</h2>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">94% Complete</span>
                  <span className="text-sm font-medium text-green-600">Excellent</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-medichain-500 to-medichain-600 rounded-full transition-all duration-500"
                    style={{ width: '94%' }}
                  />
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  Basic information
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  Medical conditions
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  Lab results
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs">○</span>
                  </div>
                  Genetic data (optional)
                </div>
              </div>
            </div>

            {/* Rewards Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-medichain-600 to-medichain-800 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5" />
                <h2 className="text-lg font-semibold">ASI Rewards</h2>
              </div>
              
              <div className="mb-4">
                <div className="text-3xl font-bold mb-1">125 ASI</div>
                <div className="text-medichain-200 text-sm">≈ $187.50 USD</div>
              </div>
              
              <div className="space-y-2 text-sm text-medichain-100">
                <div className="flex justify-between">
                  <span>Profile completion</span>
                  <span>+15 ASI</span>
                </div>
                <div className="flex justify-between">
                  <span>Trial enrollment</span>
                  <span>+50 ASI</span>
                </div>
                <div className="flex justify-between">
                  <span>Data contribution</span>
                  <span>+60 ASI</span>
                </div>
              </div>
              
              <button className="w-full mt-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition text-sm font-medium">
                View Reward History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
