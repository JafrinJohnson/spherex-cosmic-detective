import React from "react";
import Link from "next/link";
import { Compass, Sparkles, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[65vh] flex items-center justify-center py-12">
      <div className="glass max-w-xl w-full p-8 sm:p-12 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-pastel-lavender/15 border border-pastel-lavender/35 flex items-center justify-center text-pastel-lavender mx-auto">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-medium text-cosmic-text">
            Page not found
          </h1>
          <p className="text-sm text-cosmic-muted leading-relaxed">
            The sky sector or page you requested could not be found.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium bg-infrared-gradient text-[#07090F] shadow-infrared-glow"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
          >
            <Sparkles className="w-4 h-4 text-pastel-sky" />
            <span>Explore Targets</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
