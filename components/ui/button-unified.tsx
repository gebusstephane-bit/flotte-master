"use client";

/**
 * ButtonUnified - Composant bouton unifié FleetFlow 2.0
 * Remplace toutes les variantes dispersées dans l'app
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// VARIANTES DE STYLE
// ============================================

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: 
          "bg-[#0066FF] text-white shadow-lg shadow-blue-500/30 hover:bg-[#0052CC] hover:shadow-blue-600/40 focus-visible:ring-blue-500",
        secondary: 
          "bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-slate-400",
        danger: 
          "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-red-600/40 focus-visible:ring-red-500",
        ghost: 
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
        link: 
          "text-[#0066FF] underline-offset-4 hover:underline focus-visible:ring-blue-500",
        accent: 
          "bg-[#00D4AA] text-white shadow-lg shadow-emerald-500/30 hover:bg-[#00B894] hover:shadow-emerald-600/40 focus-visible:ring-emerald-500",
      },
      size: {
        xs: "h-8 px-3 text-xs rounded-md",
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        xl: "h-12 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      isFullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      isFullWidth: false,
    },
  }
);

// ============================================
// TYPES
// ============================================

export interface ButtonUnifiedProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  asChild?: boolean;
  isFullWidth?: boolean;
}

// ============================================
// COMPOSANT
// ============================================

const ButtonUnified = React.forwardRef<HTMLButtonElement, ButtonUnifiedProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isFullWidth = false,
      leftIcon,
      rightIcon,
      isLoading = false,
      loadingText,
      children,
      asChild = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = cn(
      buttonVariants({ variant, size, isFullWidth }),
      className
    );

    // Si asChild est true, on retourne simplement les children (sans ref forwarding)
    if (asChild) {
      return <>{children}</>;
    }

    // Comportement normal avec button
    return (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="flex items-center">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

ButtonUnified.displayName = "ButtonUnified";

export { ButtonUnified, buttonVariants };
export default ButtonUnified;
