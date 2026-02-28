import { type HTMLAttributes } from "react";
import { clsx } from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700 ring-gray-300/50",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-300/50",
  warning: "bg-amber-50 text-amber-700 ring-amber-300/50",
  error: "bg-red-50 text-red-700 ring-red-300/50",
  info: "bg-blue-50 text-blue-700 ring-blue-300/50",
};

function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
