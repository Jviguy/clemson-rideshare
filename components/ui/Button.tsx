"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-clemson-orange text-white hover:bg-clemson-orange-dark active:bg-clemson-orange-dark/90 focus-visible:ring-clemson-orange/50",
  secondary:
    "bg-clemson-purple text-white hover:bg-clemson-purple-dark active:bg-clemson-purple-dark/90 focus-visible:ring-clemson-purple/50",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus-visible:ring-clemson-orange/50",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400/50",
  danger:
    "bg-error text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-error/50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2 text-sm rounded-lg gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      asChild = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const classes = clsx(
      "inline-flex items-center justify-center font-medium transition-colors duration-150",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
      "disabled:opacity-50 disabled:pointer-events-none",
      "cursor-pointer",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (asChild) {
      // When asChild is true, render children directly but merge classes.
      // Expects a single React element child.
      return <span className={classes}>{children}</span>;
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <Loader2
            className={clsx(
              "animate-spin",
              size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"
            )}
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps, ButtonVariant, ButtonSize };
