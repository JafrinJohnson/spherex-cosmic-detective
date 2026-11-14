"use client";

import React from "react";
import Link from "next/link";
import { RotateCcw, Compass, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-16">
      <div className="glass p-8 sm:p-10 max-w-lg w-full text-center space-y-6 shadow-glass-glow">
        <div className="w-14 h-14 rounded-2xl bg-pastel-peach/15 border border-pastel-peach/40 flex items-center justify-center mx-auto text-pastel-peach">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl sm:text-3xl font-medium text-cosmic-text">
            Signal interrupted
          </h1>
          <p className="text-sm sm:text-base text-cosmic-muted leading-relaxed">
            {error?.message ||
              "Something unexpected happened while rendering this patch of sky."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-[44px] inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium bg-infrared-gradient text-[#07090F] shadow-infrared-glow hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try again</span>
          </button>

          <Link
            href="/explore"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
          >
            <Compass className="w-4 h-4 text-pastel-sky" />
            <span>Return to Explore</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
