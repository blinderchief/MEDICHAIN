"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  Loader2,
  ClipboardCheck,
  Sparkles,
  Shield,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface EligibilityCriterion {
  id: string;
  criterion: string;
  category: "inclusion" | "exclusion";
  status: "met" | "not_met" | "unknown" | "partial";
  explanation?: string;
  userResponse?: string;
  aiConfidence?: number;
}

interface EligibilityCheckerProps {
  trialId: string;
  trialTitle: string;
  criteria: EligibilityCriterion[];
  onCheckEligibility?: (responses: Record<string, string>) => Promise<void>;
  onUpdateCriterion?: (criterionId: string, response: string) => void;
  isLoading?: boolean;
  overallScore?: number;
  aiSummary?: string;
}

const statusConfig = {
  met: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Met",
  },
  not_met: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Not Met",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Unknown",
  },
  partial: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Partial",
  },
};

export function EligibilityChecker({
  trialId,
  trialTitle,
  criteria,
  onCheckEligibility,
  onUpdateCriterion,
  isLoading = false,
  overallScore,
  aiSummary,
}: EligibilityCheckerProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isChecking, setIsChecking] = useState(false);

  const inclusionCriteria = criteria.filter((c) => c.category === "inclusion");
  const exclusionCriteria = criteria.filter((c) => c.category === "exclusion");

  const metCriteria = criteria.filter((c) => c.status === "met").length;
  const totalCriteria = criteria.length;
  const progressPercentage = (metCriteria / totalCriteria) * 100;

  const toggleCriterion = (id: string) => {
    const newExpanded = new Set(expandedCriteria);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCriteria(newExpanded);
  };

  const handleResponseChange = (criterionId: string, response: string) => {
    setResponses((prev) => ({ ...prev, [criterionId]: response }));
    onUpdateCriterion?.(criterionId, response);
  };

  const handleCheckEligibility = async () => {
    if (!onCheckEligibility) return;
    setIsChecking(true);
    try {
      await onCheckEligibility(responses);
    } finally {
      setIsChecking(false);
    }
  };

  const renderCriteriaList = (
    items: EligibilityCriterion[],
    title: string,
    isInclusion: boolean
  ) => (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        {isInclusion ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
        {title}
        <Badge variant="outline" className="ml-auto">
          {items.filter((c) => c.status === "met").length}/{items.length}
        </Badge>
      </h4>

      <div className="space-y-2">
        {items.map((criterion) => {
          const config = statusConfig[criterion.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedCriteria.has(criterion.id);

          return (
            <div
              key={criterion.id}
              className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
            >
              <button
                onClick={() => toggleCriterion(criterion.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <StatusIcon className={`w-5 h-5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{criterion.criterion}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs ${config.color} ${config.borderColor}`}
                  >
                    {config.label}
                  </Badge>
                  <ChevronRight
                    className={`w-4 h-4 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-200/50">
                  {criterion.explanation && (
                    <div className="p-3 rounded-lg bg-white/50 mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        AI Analysis
                      </p>
                      <p className="text-sm text-gray-700">
                        {criterion.explanation}
                      </p>
                      {criterion.aiConfidence && (
                        <p className="text-xs text-gray-400 mt-1">
                          Confidence: {criterion.aiConfidence}%
                        </p>
                      )}
                    </div>
                  )}

                  {onUpdateCriterion && criterion.status === "unknown" && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-500">
                        Your Response
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={responses[criterion.id] || criterion.userResponse || ""}
                          onChange={(e) =>
                            handleResponseChange(criterion.id, e.target.value)
                          }
                          placeholder="Enter your answer..."
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Eligibility Check
              </CardTitle>
              <CardDescription className="mt-1">{trialTitle}</CardDescription>
            </div>
          </div>
          {overallScore !== undefined && (
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{overallScore}%</div>
              <div className="text-xs text-gray-500">Match Score</div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Progress Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Criteria Evaluation Progress</span>
            <span className="font-medium text-gray-900">
              {metCriteria}/{totalCriteria} criteria met
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* AI Summary */}
        {aiSummary && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-purple-700 mb-1">
                  AI Eligibility Summary
                </h4>
                <p className="text-sm text-gray-700">{aiSummary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-cyan-200 border-t-cyan-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-cyan-500 absolute inset-0 m-auto" />
            </div>
            <p className="text-sm text-gray-500">Analyzing eligibility criteria...</p>
          </div>
        ) : (
          <>
            {/* Inclusion Criteria */}
            {inclusionCriteria.length > 0 &&
              renderCriteriaList(
                inclusionCriteria,
                "Inclusion Criteria",
                true
              )}

            {/* Exclusion Criteria */}
            {exclusionCriteria.length > 0 &&
              renderCriteriaList(
                exclusionCriteria,
                "Exclusion Criteria",
                false
              )}
          </>
        )}

        {/* Action Buttons */}
        {onCheckEligibility && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCheckEligibility}
              disabled={isChecking}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Eligibility...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Re-check Eligibility
                </>
              )}
            </Button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 text-center pt-2">
          This eligibility check is AI-assisted and should be verified by the trial coordinator.
          Final eligibility determination is made by the clinical trial team.
        </p>
      </CardContent>
    </Card>
  );
}
