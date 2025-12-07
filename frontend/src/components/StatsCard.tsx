"use client";

import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  variant?: "default" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  default: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    valueColor: "text-gray-900",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    valueColor: "text-green-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    valueColor: "text-amber-700",
  },
  danger: {
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    valueColor: "text-red-700",
  },
  info: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
    valueColor: "text-cyan-700",
  },
};

const sizeStyles = {
  sm: {
    padding: "p-3",
    title: "text-xs",
    value: "text-lg",
    icon: "w-8 h-8",
    iconInner: "w-4 h-4",
  },
  md: {
    padding: "p-4",
    title: "text-sm",
    value: "text-2xl",
    icon: "w-10 h-10",
    iconInner: "w-5 h-5",
  },
  lg: {
    padding: "p-6",
    title: "text-base",
    value: "text-4xl",
    icon: "w-14 h-14",
    iconInner: "w-7 h-7",
  },
};

const trendColors = {
  up: "text-green-600 bg-green-50",
  down: "text-red-600 bg-red-50",
  neutral: "text-gray-600 bg-gray-50",
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  size = "md",
  className = "",
  children,
}: StatsCardProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : Minus;

  return (
    <Card
      className={`overflow-hidden border ${variantStyle.border} ${className}`}
    >
      <CardContent className={`${sizeStyle.padding} ${variantStyle.bg}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p
              className={`${sizeStyle.title} font-medium text-gray-500 uppercase tracking-wide`}
            >
              {title}
            </p>

            {/* Value */}
            <p
              className={`${sizeStyle.value} font-bold ${variantStyle.valueColor} mt-1`}
            >
              {value}
            </p>

            {/* Subtitle or Trend */}
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    trendColors[trend.direction]
                  }`}
                >
                  <TrendIcon className="w-3 h-3" />
                  {trend.value > 0 && "+"}
                  {trend.value}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-gray-500">{subtitle}</span>
              )}
              {trend && <span className="text-xs text-gray-400">{trend.label}</span>}
            </div>
          </div>

          {/* Icon */}
          {Icon && (
            <div
              className={`${sizeStyle.icon} rounded-xl ${variantStyle.iconBg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`${sizeStyle.iconInner} ${variantStyle.iconColor}`} />
            </div>
          )}
        </div>

        {/* Optional children for additional content */}
        {children && <div className="mt-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

// Preset variants for common use cases
export function MatchScoreCard({
  score,
  label = "Match Score",
}: {
  score: number;
  label?: string;
}) {
  const variant =
    score >= 90
      ? "success"
      : score >= 70
      ? "info"
      : score >= 50
      ? "warning"
      : "danger";

  return (
    <StatsCard
      title={label}
      value={`${score}%`}
      variant={variant}
      subtitle={
        score >= 90
          ? "Excellent match"
          : score >= 70
          ? "Good match"
          : score >= 50
          ? "Moderate match"
          : "Low match"
      }
    />
  );
}

export function EnrollmentCard({
  current,
  target,
  label = "Enrollment",
}: {
  current: number;
  target: number;
  label?: string;
}) {
  const percentage = Math.round((current / target) * 100);
  const variant = percentage >= 90 ? "warning" : percentage >= 50 ? "info" : "success";

  return (
    <StatsCard
      title={label}
      value={`${current}/${target}`}
      variant={variant}
      subtitle={`${percentage}% enrolled`}
    >
      <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-current rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </StatsCard>
  );
}
