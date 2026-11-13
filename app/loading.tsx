import React from "react";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] flex items-center justify-center px-4 py-16"
    >
      <div className="glass p-8 sm:p-10 max-w-sm w-full flex flex-col items-center text-center gap-5 shadow-glass-glow">
        {/* Orbiting Planet Animation */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Orbit Track */}
          <div className="absolute inset-0 rounded-full border border-white/15" />

          {/* Orbiting Moon */}
          <div className="absolute inset-0 animate-spin [animation-duration:4s] motion-reduce:animate-none">
            <span className="block w-3 h-3 rounded-full bg-pastel-sky shadow-[0_0_12px_#A2D2FF] mx-auto -mt-1.5" />
          </div>

          {/* Central Glowing Pastel Planet + Ring */}
          <div
            className="w-12 h-12 rounded-full relative shadow-[0_0_30px_rgba(195,177,225,0.45)]"
            style={{
              background:
                "radial-gradient(circle at 30% 28%, #FFB5A7 0%, #C3B1E1 52%, #4B3A8C 95%)",
            }}
          >
            <div className="absolute -inset-2.5 rounded-full border border-[#FFB5A7]/50 rotate-[-20deg] scale-x-125" />
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-heading text-base font-bold text-cosmic-text">
            Aligning Infrared Telescope
          </p>
          <p className="text-xs font-mono text-cosmic-muted">
            Loading SPHEREx sky frames…
          </p>
        </div>
      </div>
    </div>
  );
}

