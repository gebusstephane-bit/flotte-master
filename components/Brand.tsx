"use client";

import { Truck, Wrench } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

type BrandSize = "sm" | "md" | "lg";

interface BrandProps {
  size?: BrandSize;
  showTagline?: boolean;
  dark?: boolean;
}

const sizeConfig = {
  sm: {
    icon: "w-8 h-8",
    iconInner: "w-3.5 h-3.5",
    iconAccent: "w-2.5 h-2.5",
    text: "text-base",
    tagline: "text-[10px]",
    gap: "gap-2.5",
  },
  md: {
    icon: "w-10 h-10",
    iconInner: "w-4.5 h-4.5",
    iconAccent: "w-3 h-3",
    text: "text-xl",
    tagline: "text-xs",
    gap: "gap-3",
  },
  lg: {
    icon: "w-16 h-16",
    iconInner: "w-7 h-7",
    iconAccent: "w-5 h-5",
    text: "text-3xl",
    tagline: "text-sm",
    gap: "gap-4",
  },
} as const;

export function BrandMark({
  size = "md",
  dark = false,
}: {
  size?: BrandSize;
  dark?: boolean;
}) {
  const s = sizeConfig[size];

  return (
    <div
      className={`
        ${s.icon} relative rounded-xl
        bg-gradient-to-br from-blue-600 to-blue-800
        flex items-center justify-center
        shadow-lg shadow-blue-900/30
        transition-transform duration-200 hover:scale-105
        group
      `}
    >
      {/* Main icon */}
      <Truck
        className={`${s.iconInner} text-white transition-transform duration-200 group-hover:-translate-x-[1px]`}
        strokeWidth={2.2}
      />
      {/* Accent wrench badge */}
      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-[3px] shadow-md ring-2 ring-slate-900">
        <Wrench
          className={`${s.iconAccent} text-white`}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );
}

export function Brand({
  size = "md",
  showTagline = true,
  dark = false,
}: BrandProps) {
  const s = sizeConfig[size];
  const textColor = dark ? "text-white" : "text-slate-900";
  const taglineColor = dark ? "text-slate-400" : "text-slate-500";

  if (size === "lg") {
    // Stacked layout for login page
    return (
      <div className="flex flex-col items-center gap-4">
        <BrandMark size={size} dark={dark} />
        <div className="text-center">
          <h1 className={`${s.text} font-extrabold tracking-tight ${textColor}`}>
            <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
              FLEET
            </span>
            <span className="text-white">FLOW</span>
          </h1>
          {showTagline && (
            <p className={`${s.tagline} ${taglineColor} mt-1.5 font-medium tracking-widest uppercase`}>
              {APP_TAGLINE}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Inline layout for sidebar / header
  return (
    <div className={`flex items-center ${s.gap}`}>
      <BrandMark size={size} dark={dark} />
      <div>
        <h1 className={`${s.text} font-extrabold tracking-tight ${textColor} leading-none`}>
          <span className="text-blue-400">FLEET</span>
          <span className="text-white">FLOW</span>
        </h1>
        {showTagline && (
          <p className={`${s.tagline} ${taglineColor} font-medium tracking-widest uppercase mt-0.5`}>
            {APP_TAGLINE}
          </p>
        )}
      </div>
    </div>
  );
}
