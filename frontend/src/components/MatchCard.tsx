"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Star, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight,
  Sparkles,
  TrendingUp,
  Shield,
  AlertCircle,
  Zap,
  Check,
  X,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Progress } from "./ui/progress";

interface Match {
  id: string;
  trialId: string;
  trialTitle: string;
  trialPhase: string;
  sponsor: string;
  location: string;
  matchScore: number;
  status: "pending" | "consented" | "enrolled" | "declined" | "withdrawn";
  matchedAt: string;
  eligibilityFactors: {
    factor: string;
    status: "met" | "unmet" | "partial";
    explanation?: string;
  }[];
  aiInsights?: string;
  estimatedDuration?: string;
  compensation?: string;
}

interface MatchCardProps {
  match: Match;
  onConsent?: (matchId: string) => void;
  onDecline?: (matchId: string) => void;
  onViewDetails?: (matchId: string) => void;
  isLoading?: boolean;
}

const statusConfig = {
  pending: { label: "Pending Review", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  consented: { label: "Consent Given", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  enrolled: { label: "Enrolled", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
  declined: { label: "Declined", color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  withdrawn: { label: "Withdrawn", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800" },
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 75) return "text-cyan-600 dark:text-cyan-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const getScoreBg = (score: number): string => {
  if (score >= 90) return "from-emerald-500 to-teal-500";
  if (score >= 75) return "from-cyan-500 to-blue-500";
  if (score >= 60) return "from-amber-500 to-orange-500";
  return "from-red-500 to-pink-500";
};

export function MatchCard({ match, onConsent, onDecline, onViewDetails, isLoading }: MatchCardProps) {
  const [showInsights, setShowInsights] = useState(false);
  const statusInfo = statusConfig[match.status];
  const metFactors = match.eligibilityFactors.filter(f => f.status === "met").length;
  const totalFactors = match.eligibilityFactors.length;
  
  return (
    <Card className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-500 rounded-2xl">
      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getScoreBg(match.matchScore)}`} />
      
      <CardHeader className="pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <Badge variant="outline" className={`text-xs font-medium px-2.5 py-0.5 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 px-2.5 py-0.5">
                Phase {match.trialPhase}
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2 group-hover:text-medichain-600 dark:group-hover:text-medichain-400 transition-colors">
              <Link href={`/trials/${match.trialId}`} className="hover:underline decoration-2 underline-offset-2">
                {match.trialTitle}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              {match.sponsor}
            </CardDescription>
          </div>
          
          {/* Match Score - Redesigned */}
          <div className="flex-shrink-0">
            <div className={`relative w-18 h-18 rounded-2xl bg-gradient-to-br ${getScoreBg(match.matchScore)} p-0.5 shadow-lg`}>
              <div className="absolute inset-0.5 rounded-[14px] bg-white dark:bg-slate-900 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${getScoreColor(match.matchScore)}`}>
                  {match.matchScore}%
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Match</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-4">
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-slate-500" />
            </div>
            <span className="truncate">{match.location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <span>{new Date(match.matchedAt).toLocaleDateString()}</span>
          </div>
          {match.estimatedDuration && (
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-slate-500" />
              </div>
              <span>{match.estimatedDuration}</span>
            </div>
          )}
          {match.compensation && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{match.compensation}</span>
            </div>
          )}
        </div>
        
        {/* Eligibility Progress */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Eligibility Criteria</span>
            <span className="font-semibold text-slate-900 dark:text-white">{metFactors}/{totalFactors} met</span>
          </div>
          <Progress value={(metFactors / totalFactors) * 100} className="h-2" />
          
          {/* Quick factors preview */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {match.eligibilityFactors.slice(0, 4).map((factor, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  factor.status === "met" 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" 
                    : factor.status === "partial"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}
              >
                {factor.status === "met" ? <Check className="w-3 h-3" /> : factor.status === "partial" ? "~" : <X className="w-3 h-3" />}
                {factor.factor}
              </span>
            ))}
            {match.eligibilityFactors.length > 4 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 font-medium">
                +{match.eligibilityFactors.length - 4} more
              </span>
            )}
          </div>
        </div>
        
        {/* AI Insights */}
        {match.aiInsights && (
          <div className="rounded-xl bg-gradient-to-r from-medichain-50 to-blue-50 dark:from-medichain-900/20 dark:to-blue-900/20 p-4 border border-medichain-100 dark:border-medichain-800">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="flex items-center gap-2 text-sm font-semibold text-medichain-700 dark:text-medichain-300 w-full"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-medichain-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span>AI Insights</span>
              <ChevronRight className={`w-4 h-4 ml-auto transition-transform duration-200 ${showInsights ? "rotate-90" : ""}`} />
            </button>
            {showInsights && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed pl-10">
                {match.aiInsights}
              </p>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex items-center justify-between gap-3 pt-4 pb-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
        {match.status === "pending" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline?.(match.id)}
              disabled={isLoading}
              className="flex-1 h-10 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4 mr-1.5" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => onConsent?.(match.id)}
              disabled={isLoading}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-medichain-500 to-blue-500 hover:from-medichain-600 hover:to-blue-600 shadow-lg shadow-medichain-500/25"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Give Consent
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(match.id)}
            className="w-full h-10 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 group/btn"
          >
            View Details
            <ArrowUpRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
