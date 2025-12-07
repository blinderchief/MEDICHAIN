"use client";

import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Building2,
  ChevronRight,
  Star,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";

interface Trial {
  id: string;
  title: string;
  sponsor: string;
  phase: "Phase I" | "Phase II" | "Phase III" | "Phase IV";
  status: "recruiting" | "active" | "completed" | "suspended" | "withdrawn";
  condition: string;
  location: string;
  targetEnrollment: number;
  currentEnrollment: number;
  startDate: string;
  endDate?: string;
  briefDescription: string;
  compensation?: string;
  matchScore?: number;
  eligibilitySummary?: string[];
}

interface TrialCardProps {
  trial: Trial;
  showMatchScore?: boolean;
  onEnroll?: (trialId: string) => void;
  isLoading?: boolean;
}

const statusConfig = {
  recruiting: { 
    label: "Recruiting", 
    color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    icon: Users,
    dotColor: "bg-emerald-500"
  },
  active: { 
    label: "Active", 
    color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    icon: CheckCircle,
    dotColor: "bg-blue-500"
  },
  completed: { 
    label: "Completed", 
    color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
    icon: CheckCircle,
    dotColor: "bg-slate-400"
  },
  suspended: { 
    label: "Suspended", 
    color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    icon: AlertCircle,
    dotColor: "bg-amber-500"
  },
  withdrawn: { 
    label: "Withdrawn", 
    color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    icon: AlertCircle,
    dotColor: "bg-red-500"
  },
};

const phaseColors: Record<string, string> = {
  "Phase I": "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  "Phase II": "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
  "Phase III": "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800",
  "Phase IV": "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
};

export function TrialCard({ trial, showMatchScore = false, onEnroll, isLoading }: TrialCardProps) {
  const statusInfo = statusConfig[trial.status];
  const StatusIcon = statusInfo.icon;
  const enrollmentPercentage = (trial.currentEnrollment / trial.targetEnrollment) * 100;
  const spotsRemaining = trial.targetEnrollment - trial.currentEnrollment;
  
  return (
    <Card className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-500 rounded-2xl h-full flex flex-col">
      {/* Match Score Banner (if applicable) */}
      {showMatchScore && trial.matchScore && (
        <div className="relative bg-gradient-to-r from-medichain-500 via-medichain-600 to-blue-600 px-4 py-3 flex items-center justify-between overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTZzLTItNC0yLTZjMC0yIDItNCAyLTZWNmMwLTIgMi00IDQtNGgydjJoLTJjMCAwLTIgMi0yIDRzMiA0IDIgNmMwIDItMiA0LTIgNnMyIDQgMiA2YzAgMi0yIDQtMiA2djEwaC0yVjM0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">
                {trial.matchScore}% Match
              </span>
            </div>
          </div>
          <div className="relative flex items-center gap-1.5 text-xs text-white/80 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            AI Recommended
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <Badge variant="outline" className={`text-xs font-medium px-2.5 py-0.5 ${statusInfo.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor} mr-1.5 animate-pulse`} />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className={`text-xs font-medium px-2.5 py-0.5 ${phaseColors[trial.phase]}`}>
                {trial.phase}
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-medichain-600 dark:group-hover:text-medichain-400 transition-colors">
              <Link href={`/trials/${trial.id}`} className="hover:underline decoration-2 underline-offset-2">
                {trial.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1.5 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {trial.sponsor}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4 pb-4">
        {/* Condition Tag */}
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium">
          {trial.condition}
        </div>
        
        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
          {trial.briefDescription}
        </p>
        
        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <span className="truncate">{trial.location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <span>{new Date(trial.startDate).toLocaleDateString()}</span>
          </div>
          {trial.compensation && (
            <div className="flex items-center gap-2.5 col-span-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{trial.compensation}</span>
            </div>
          )}
        </div>
        
        {/* Enrollment Progress */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
              <Users className="w-4 h-4" />
              Enrollment
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {trial.currentEnrollment}/{trial.targetEnrollment}
            </span>
          </div>
          <Progress value={enrollmentPercentage} className="h-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{Math.round(enrollmentPercentage)}%</span> enrolled • 
            <span className={`ml-1 font-medium ${spotsRemaining < 10 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {spotsRemaining} spots remaining
            </span>
          </p>
        </div>
        
        {/* Eligibility Summary */}
        {trial.eligibilitySummary && trial.eligibilitySummary.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Key Requirements
            </span>
            <ul className="space-y-1.5">
              {trial.eligibilitySummary.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="line-clamp-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex items-center justify-between gap-3 pt-4 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 mt-auto">
        <Link href={`/trials/${trial.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 group/btn">
            Learn More
            <ArrowUpRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Button>
        </Link>
        {trial.status === "recruiting" && onEnroll && (
          <Button
            size="sm"
            onClick={() => onEnroll(trial.id)}
            disabled={isLoading}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-medichain-500 to-blue-500 hover:from-medichain-600 hover:to-blue-600 shadow-lg shadow-medichain-500/25"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Apply Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
