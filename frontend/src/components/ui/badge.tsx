import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
        secondary: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
        success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        outline: "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300",
        gradient: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {icon && <span className="mr-1 -ml-0.5">{icon}</span>}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
