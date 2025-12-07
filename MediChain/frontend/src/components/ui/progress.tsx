import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger" | "gradient";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, showLabel = false, size = "md", variant = "default", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };
    
    const variantClasses = {
      default: "bg-cyan-500",
      success: "bg-green-500",
      warning: "bg-yellow-500",
      danger: "bg-red-500",
      gradient: "bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500",
    };

    // Auto-detect variant based on value
    const autoVariant = variant === "default" 
      ? percentage >= 80 ? "success" : percentage >= 50 ? "default" : percentage >= 30 ? "warning" : "danger"
      : variant;

    return (
      <div className="w-full">
        {showLabel && (
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
        <div
          ref={ref}
          className={cn(
            "w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
            sizeClasses[size],
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              variantClasses[autoVariant]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
