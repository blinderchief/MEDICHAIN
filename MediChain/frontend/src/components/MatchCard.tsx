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
  AlertCircle
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
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-800 border-amber-200" },
  consented: { label: "Consent Given", color: "bg-blue-100 text-blue-800 border-blue-200" },
  enrolled: { label: "Enrolled", color: "bg-green-100 text-green-800 border-green-200" },
  declined: { label: "Declined", color: "bg-gray-100 text-gray-800 border-gray-200" },
  withdrawn: { label: "Withdrawn", color: "bg-red-100 text-red-800 border-red-200" },
};

const getScoreColor = (score: number): string => {
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
};

const getScoreGradient = (score: number): string => {
  if (score >= 90) return "from-green-500 to-emerald-500";
  if (score >= 75) return "from-emerald-500 to-cyan-500";
  if (score >= 60) return "from-amber-500 to-orange-500";
  return "from-red-500 to-pink-500";
};

export function MatchCard({ match, onConsent, onDecline, onViewDetails, isLoading }: MatchCardProps) {
  const [showInsights, setShowInsights] = useState(false);
  const statusInfo = statusConfig[match.status];
  const metFactors = match.eligibilityFactors.filter(f => f.status === "met").length;
  const totalFactors = match.eligibilityFactors.length;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-transparent hover:border-l-cyan-500 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={statusInfo.color}>
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Phase {match.trialPhase}
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-cyan-700 transition-colors">
              <Link href={`/trials/${match.trialId}`} className="hover:underline">
                {match.trialTitle}
              </Link>
            </CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              {match.sponsor}
            </CardDescription>
          </div>
          
          {/* Match Score */}
          <div className="flex-shrink-0 text-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-gray-200"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(match.matchScore / 100) * 176} 176`}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className={`stop-color-${getScoreGradient(match.matchScore).split(' ')[0]}`} />
                    <stop offset="100%" className={`stop-color-${getScoreGradient(match.matchScore).split(' ')[2]}`} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${getScoreColor(match.matchScore)}`}>
                  {match.matchScore}%
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-500">Match</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Meta Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="truncate">{match.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span>{new Date(match.matchedAt).toLocaleDateString()}</span>
          </div>
          {match.estimatedDuration && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{match.estimatedDuration}</span>
            </div>
          )}
          {match.compensation && (
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-green-600 font-medium">{match.compensation}</span>
            </div>
          )}
        </div>
        
        {/* Eligibility Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Eligibility Criteria Met</span>
            <span className="font-medium text-gray-900">{metFactors}/{totalFactors}</span>
          </div>
          <Progress value={(metFactors / totalFactors) * 100} className="h-2" />
          
          {/* Quick factors preview */}
          <div className="flex flex-wrap gap-1 mt-2">
            {match.eligibilityFactors.slice(0, 4).map((factor, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                  factor.status === "met" 
                    ? "bg-green-50 text-green-700" 
                    : factor.status === "partial"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {factor.status === "met" ? "✓" : factor.status === "partial" ? "~" : "✗"} {factor.factor}
              </span>
            ))}
            {match.eligibilityFactors.length > 4 && (
              <span className="text-xs text-gray-500 px-2 py-0.5">
                +{match.eligibilityFactors.length - 4} more
              </span>
            )}
          </div>
        </div>
        
        {/* AI Insights */}
        {match.aiInsights && (
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-100">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="flex items-center gap-2 text-sm font-medium text-cyan-700 w-full"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Insights</span>
              <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${showInsights ? "rotate-90" : ""}`} />
            </button>
            {showInsights && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {match.aiInsights}
              </p>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex items-center justify-between gap-3 pt-4 border-t bg-gray-50/50">
        {match.status === "pending" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline?.(match.id)}
              disabled={isLoading}
              className="flex-1"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => onConsent?.(match.id)}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Shield className="w-4 h-4 mr-1" />
              Give Consent
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(match.id)}
            className="w-full"
          >
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
