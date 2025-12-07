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
    color: "bg-green-100 text-green-800 border-green-200",
    icon: Users 
  },
  active: { 
    label: "Active", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle 
  },
  completed: { 
    label: "Completed", 
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: CheckCircle 
  },
  suspended: { 
    label: "Suspended", 
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: AlertCircle 
  },
  withdrawn: { 
    label: "Withdrawn", 
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle 
  },
};

const phaseColors: Record<string, string> = {
  "Phase I": "bg-purple-100 text-purple-800 border-purple-200",
  "Phase II": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Phase III": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Phase IV": "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function TrialCard({ trial, showMatchScore = false, onEnroll, isLoading }: TrialCardProps) {
  const statusInfo = statusConfig[trial.status];
  const StatusIcon = statusInfo.icon;
  const enrollmentPercentage = (trial.currentEnrollment / trial.targetEnrollment) * 100;
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
      {/* Match Score Banner (if applicable) */}
      {showMatchScore && trial.matchScore && (
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-sm font-medium text-white">
              {trial.matchScore}% Match
            </span>
          </div>
          <span className="text-xs text-cyan-100">AI Recommended</span>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className={statusInfo.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className={phaseColors[trial.phase]}>
                {trial.phase}
              </Badge>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-cyan-700 transition-colors">
              <Link href={`/trials/${trial.id}`} className="hover:underline">
                {trial.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1 text-gray-500">
              <Building2 className="w-3 h-3" />
              {trial.sponsor}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 space-y-4">
        {/* Condition Tag */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
          {trial.condition}
        </div>
        
        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-3">
          {trial.briefDescription}
        </p>
        
        {/* Meta Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{trial.location}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{new Date(trial.startDate).toLocaleDateString()}</span>
          </div>
          {trial.compensation && (
            <div className="flex items-center gap-2 text-gray-600 col-span-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-green-600 font-medium">{trial.compensation}</span>
            </div>
          )}
        </div>
        
        {/* Enrollment Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Enrollment
            </span>
            <span className="font-medium text-gray-900">
              {trial.currentEnrollment}/{trial.targetEnrollment}
            </span>
          </div>
          <Progress value={enrollmentPercentage} className="h-2" />
          <p className="text-xs text-gray-500">
            {Math.round(enrollmentPercentage)}% enrolled • {trial.targetEnrollment - trial.currentEnrollment} spots remaining
          </p>
        </div>
        
        {/* Eligibility Summary */}
        {trial.eligibilitySummary && trial.eligibilitySummary.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Key Requirements
            </span>
            <ul className="space-y-1">
              {trial.eligibilitySummary.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex items-center justify-between gap-3 pt-4 border-t bg-gray-50/50 mt-auto">
        <Link href={`/trials/${trial.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Learn More
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
        {trial.status === "recruiting" && onEnroll && (
          <Button
            size="sm"
            onClick={() => onEnroll(trial.id)}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
          >
            Apply Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
