"use client";

/**
 * SelectUnified - Select stylisé FleetFlow 2.0
 * Remplace les <select> natifs par un composant shadcn/ui cohérent
 * 
 * @example
 * <SelectUnified 
 *   options={[{ value: "porteur", label: "Porteur" }]}
 *   value={type}
 *   onChange={setType}
 *   placeholder="Sélectionnez un type"
 * />
 */

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectUnifiedProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const SelectUnified = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectUnifiedProps
>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Sélectionner...",
      label,
      error,
      disabled = false,
      required = false,
      className,
      size = "md",
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-8 text-xs",
      md: "h-10 text-sm",
      lg: "h-12 text-base",
    };

    return (
      <div className={cn("w-full", className)}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <SelectPrimitive.Root value={value} onValueChange={onChange} disabled={disabled}>
          <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-slate-900 shadow-sm transition-all",
              "hover:border-slate-300 hover:bg-slate-50",
              "focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20 focus:border-[#0066FF]",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
              "data-[state=open]:border-[#0066FF] data-[state=open]:ring-2 data-[state=open]:ring-[#0066FF]/20",
              sizeClasses[size]
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 data-[state=open]:rotate-180" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                "relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
              )}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.Viewport className="p-1 max-h-60 overflow-auto">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-sm outline-none transition-colors",
                      "focus:bg-[#0066FF]/10 focus:text-[#0066FF]",
                      "hover:bg-slate-100",
                      "disabled:pointer-events-none disabled:opacity-50",
                      "data-[state=checked]:bg-[#0066FF]/5 data-[state=checked]:text-[#0066FF]"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-4 w-4 text-[#0066FF]" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        
        {error && (
          <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

SelectUnified.displayName = "SelectUnified";

export { SelectUnified };
export default SelectUnified;
