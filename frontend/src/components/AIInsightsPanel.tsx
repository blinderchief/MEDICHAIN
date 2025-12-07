"use client";

import { useState } from "react";
import {
  Sparkles,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  MessageSquare,
  Lightbulb,
  Target,
  Shield,
  Heart,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface AIInsight {
  id: string;
  type: "recommendation" | "warning" | "info" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  source?: string;
  actionable?: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface HealthMetric {
  label: string;
  value: number;
  trend: "up" | "down" | "stable";
  description: string;
}

interface AIInsightsPanelProps {
  insights: AIInsight[];
  healthMetrics?: HealthMetric[];
  matchSummary?: {
    totalMatches: number;
    highQualityMatches: number;
    averageScore: number;
    topCondition?: string;
  };
  onRefresh?: () => Promise<void>;
  onAskQuestion?: (question: string) => Promise<string>;
  isLoading?: boolean;
}

const insightTypeConfig = {
  recommendation: {
    icon: Lightbulb,
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    iconColor: "text-cyan-500",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    iconColor: "text-blue-500",
  },
  opportunity: {
    icon: Target,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    iconColor: "text-green-500",
  },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingUp,
  stable: Target,
};

export function AIInsightsPanel({
  insights,
  healthMetrics,
  matchSummary,
  onRefresh,
  onAskQuestion,
  isLoading = false,
}: AIInsightsPanelProps) {
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  const toggleInsight = (id: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedInsights(newExpanded);
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!onAskQuestion || !question.trim()) return;
    setIsAskingQuestion(true);
    try {
      const response = await onAskQuestion(question);
      setAiResponse(response);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-cyan-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                AI Insights
              </CardTitle>
              <p className="text-sm text-gray-500">
                Powered by Gemini 2.5 Pro
              </p>
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* Match Summary */}
        {matchSummary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {matchSummary.totalMatches}
              </div>
              <div className="text-xs text-gray-500">Total Matches</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-center">
              <div className="text-2xl font-bold text-green-600">
                {matchSummary.highQualityMatches}
              </div>
              <div className="text-xs text-gray-500">High Quality</div>
            </div>
            <div className="p-3 rounded-lg bg-cyan-50 text-center">
              <div className="text-2xl font-bold text-cyan-600">
                {matchSummary.averageScore}%
              </div>
              <div className="text-xs text-gray-500">Avg Score</div>
            </div>
            {matchSummary.topCondition && (
              <div className="p-3 rounded-lg bg-purple-50 text-center">
                <div className="text-sm font-bold text-purple-600 truncate">
                  {matchSummary.topCondition}
                </div>
                <div className="text-xs text-gray-500">Top Condition</div>
              </div>
            )}
          </div>
        )}

        {/* Health Metrics */}
        {healthMetrics && healthMetrics.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Health Profile Metrics
            </h3>
            <div className="grid gap-3">
              {healthMetrics.map((metric, idx) => {
                const TrendIcon = trendIcons[metric.trend];
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {metric.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {metric.value}%
                          </span>
                          <TrendIcon
                            className={`w-4 h-4 ${
                              metric.trend === "up"
                                ? "text-green-500"
                                : metric.trend === "down"
                                ? "text-red-500 rotate-180"
                                : "text-gray-400"
                            }`}
                          />
                        </div>
                      </div>
                      <Progress value={metric.value} className="h-1.5 mt-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {metric.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Insights List */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500" />
              Personalized Recommendations
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {insights.map((insight) => {
                  const config = insightTypeConfig[insight.type];
                  const InsightIcon = config.icon;
                  const isExpanded = expandedInsights.has(insight.id);

                  return (
                    <div
                      key={insight.id}
                      className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
                    >
                      <button
                        onClick={() => toggleInsight(insight.id)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <InsightIcon className={`w-5 h-5 ${config.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${config.textColor}`}>
                            {insight.title}
                          </h4>
                          {!isExpanded && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {insight.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {insight.confidence}% confident
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3">
                          <p className="text-sm text-gray-600">
                            {insight.description}
                          </p>
                          {insight.source && (
                            <p className="text-xs text-gray-400">
                              Source: {insight.source}
                            </p>
                          )}
                          {insight.actionable && insight.action && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={insight.action.onClick}
                              className={config.textColor}
                            >
                              {insight.action.label}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ask AI */}
        {onAskQuestion && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              Ask AI Assistant
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about clinical trials, eligibility, or your health..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleAskQuestion()}
              />
              <Button
                onClick={handleAskQuestion}
                disabled={isAskingQuestion || !question.trim()}
                className="bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
              >
                {isAskingQuestion ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Ask"
                )}
              </Button>
            </div>

            {aiResponse && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {aiResponse}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      AI-generated response. Always consult healthcare professionals.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
