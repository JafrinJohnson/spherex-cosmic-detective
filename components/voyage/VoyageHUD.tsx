"use client";

import React, { useMemo } from "react";
import {
  Flame,
  Zap,
  Gauge,
  Compass,
  Radio,
  Eye,
  Pause,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import type { FlightHUDState } from "./types";
import { VOYAGE_OBJECTS } from "@/data/objects";

interface VoyageHUDProps {
  hud: FlightHUDState;
  discoveredCount: number;
  totalCount: number;
  onOpenPause: () => void;
  onOpenHelp: () => void;
  onTriggerScan: () => void;
}

export function VoyageHUD({
  hud,
  discoveredCount,
  totalCount,
  onOpenPause,
  onOpenHelp,
  onTriggerScan,
}: VoyageHUDProps) {
  // Radar coordinate mapping
  // Solar system radius max is ~220, radar circle radius is 70px
  const radarScale = 64 / 225;

  const radarBodies = useMemo(() => {
    return VOYAGE_OBJECTS.map((obj) => {
      const angle = obj.initialAngle;
      const r = obj.orbitRadius * radarScale;
      const x = 70 + Math.cos(angle) * r;
      const y = 70 + Math.sin(angle) * r;
      return { id: obj.id, name: obj.name, x, y };
    });
  }, [radarScale]);

  // Ship position on radar
  const shipRadarX = 70 + hud.shipPos[0] * radarScale;
  const shipRadarY = 70 + hud.shipPos[2] * radarScale;
  const shipHeadingDeg = (hud.shipHeading * 180) / Math.PI;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden flex flex-col justify-between p-4 sm:p-6">
      {/* Heat Warning Red Vignette */}
      {hud.heat > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            boxShadow: `inset 0 0 ${hud.heat * 1.4}px rgba(239, 68, 68, ${
              hud.heat / 110
            })`,
          }}
        >
          {hud.heatWarning && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-red-600/90 text-white font-heading font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center gap-2 shadow-lg animate-pulse border border-red-300/40">
              <Flame className="w-4 h-4 text-amber-200" />
              Thermal Hazard: Approaching Sun! Move Away! ({hud.heat}%)
            </div>
          )}
        </div>
      )}

      {/* Top Header Bar: Discovered Counter, Target Tracker, Top Actions */}
      <div className="flex items-start justify-between gap-4 pointer-events-auto z-10">
        {/* Left: Discovery Badge */}
        <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-white/10 shadow-lg">
          <div className="w-8 h-8 rounded-xl bg-pastel-mint/20 border border-pastel-mint/40 flex items-center justify-center text-pastel-mint">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-cosmic-muted font-bold">
              Mission Log
            </div>
            <div className="text-sm sm:text-base font-heading font-bold text-[#F1EEFF]">
              Discovered <span className="text-pastel-mint">{discoveredCount}</span> /{" "}
              {totalCount}
            </div>
          </div>
        </div>

        {/* Center: Nearest Target Compass */}
        <div className="hidden sm:flex glass-panel px-4 py-2 rounded-2xl items-center gap-3 border border-white/10 shadow-lg">
          <Radio className="w-4 h-4 text-pastel-sky animate-pulse" />
          <div className="text-xs">
            <span className="text-cosmic-muted">Nearest Target: </span>
            <span className="font-heading font-bold text-[#F1EEFF]">
              {hud.nearestObjectName}
            </span>
            <span className="ml-2 font-mono text-pastel-peach">
              {hud.nearestObjectDist.toFixed(1)} AU
            </span>
          </div>
        </div>

        {/* Right: Controls & Pause */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenHelp}
            className="w-10 h-10 rounded-xl glass-panel border border-white/10 hover:border-white/25 flex items-center justify-center text-[#F1EEFF] hover:bg-white/10 transition-all shadow-md"
            title="Controls & Objectives"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenPause}
            className="h-10 px-3 sm:px-4 rounded-xl glass-panel border border-white/10 hover:border-white/25 flex items-center gap-2 text-[#F1EEFF] hover:bg-white/10 transition-all text-xs font-semibold shadow-md"
            title="Pause Flight"
          >
            <Pause className="w-4 h-4" />
            <span className="hidden sm:inline">Pause</span>
            <kbd className="hidden sm:inline text-[10px] bg-white/10 px-1 rounded">ESC</kbd>
          </button>
        </div>
      </div>

      {/* Center: Interactive Scan Prompt & Circular Progress */}
      <div className="my-auto flex flex-col items-center justify-center pointer-events-auto z-10">
        {hud.canScan && (
          <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-pastel-mint/40 shadow-2xl flex flex-col items-center text-center max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-200">
            {hud.isScanning ? (
              <div className="flex flex-col items-center gap-3">
                {/* Circular Scan Progress Ring */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="rgba(255, 255, 255, 0.15)"
                      strokeWidth="5"
                      fill="none"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#B5EAD7"
                      strokeWidth="5"
                      fill="none"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 * (1 - hud.scanProgress)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Eye className="w-6 h-6 text-pastel-mint absolute animate-pulse" />
                </div>
                <div className="font-heading font-bold text-sm text-[#F1EEFF]">
                  SPHEREx Spectral Scan...
                </div>
                <div className="text-xs text-pastel-mint font-mono">
                  {Math.round(hud.scanProgress * 100)}%
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-pastel-mint/20 border border-pastel-mint/40 flex items-center justify-center text-pastel-mint">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-pastel-mint font-bold">
                    Target in Range
                  </div>
                  <div className="text-lg font-heading font-bold text-[#F1EEFF]">
                    {hud.nearestObjectName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onTriggerScan}
                  className="mt-1 w-full px-5 py-2.5 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg text-sm font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>Scan Celestial Body</span>
                  <kbd className="text-[10px] bg-black/20 text-cosmic-bg px-1.5 py-0.5 rounded font-mono font-bold">
                    [E]
                  </kbd>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Flight Instruments (Left) + Radar Mini-map (Right) */}
      <div className="flex items-end justify-between gap-4 pointer-events-auto z-10">
        {/* Left: Speedometer & Boost Meter */}
        <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-xl space-y-3 min-w-[160px] sm:min-w-[200px]">
          {/* Speed Indicator */}
          <div>
            <div className="flex items-center justify-between text-xs text-cosmic-muted mb-1 font-bold">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-pastel-sky" />
                VELOCITY
              </span>
              <span className="font-mono text-[#F1EEFF]">
                {hud.speed.toFixed(1)} km/s
              </span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-pastel-sky transition-all duration-100"
                style={{ width: `${Math.min((hud.speed / 50) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Boost Energy Bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-cosmic-muted mb-1 font-bold">
              <span className="flex items-center gap-1.5">
                <Zap
                  className={`w-3.5 h-3.5 ${
                    hud.isBoosting ? "text-pastel-peach" : "text-amber-300"
                  }`}
                />
                BOOST
              </span>
              <span className="font-mono text-[#F1EEFF]">{hud.boost}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  hud.isBoosting
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse"
                    : "bg-pastel-peach"
                }`}
                style={{ width: `${hud.boost}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Circular Solar System Radar Mini-map */}
        <div className="glass-panel p-2.5 sm:p-3 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-wider text-cosmic-muted font-bold mb-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-pastel-mint" />
            Radar Map
          </div>
          <div className="relative w-[140px] h-[140px] rounded-full bg-[#080816]/80 border border-white/15 overflow-hidden flex items-center justify-center shadow-inner">
            {/* Concentric Orbit Rings on Radar */}
            <div className="absolute w-[30px] h-[30px] rounded-full border border-white/10" />
            <div className="absolute w-[60px] h-[60px] rounded-full border border-white/10" />
            <div className="absolute w-[95px] h-[95px] rounded-full border border-white/10" />
            <div className="absolute w-[130px] h-[130px] rounded-full border border-white/10" />

            {/* Sun in center */}
            <div className="absolute w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_#FFD166]" />

            {/* Celestial Body dots on radar */}
            {radarBodies.map((b) => (
              <div
                key={`radar-${b.id}`}
                className="absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pastel-sky/60"
                style={{ left: `${b.x}px`, top: `${b.y}px` }}
                title={b.name}
              />
            ))}

            {/* Ship Indicator Triangle on radar */}
            <div
              className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
              style={{
                left: `${shipRadarX}px`,
                top: `${shipRadarY}px`,
                transform: `translate(-50%, -50%) rotate(${shipHeadingDeg}deg)`,
              }}
            >
              <div
                className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-pastel-mint drop-shadow-[0_0_4px_#B5EAD7]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
