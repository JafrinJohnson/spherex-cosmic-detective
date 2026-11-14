"use client";

import React from "react";
import Link from "next/link";
import {
  Play,
  RotateCcw,
  GraduationCap,
  Volume2,
  VolumeX,
  Keyboard,
  X,
} from "lucide-react";
import { useAudio } from "@/context/AudioProvider";

interface VoyagePauseModalProps {
  onResume: () => void;
  onReset: () => void;
  discoveredCount: number;
  totalCount: number;
}

export function VoyagePauseModal({
  onResume,
  onReset,
  discoveredCount,
  totalCount,
}: VoyagePauseModalProps) {
  const { playSound, muted, toggleMute, volumes, updateVolumes } = useAudio();

  const handleResume = () => {
    playSound("click");
    onResume();
  };

  const handleReset = () => {
    playSound("click");
    onReset();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080816]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close / Resume */}
        <button
          type="button"
          onClick={handleResume}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#F1EEFF] flex items-center justify-center transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-wider text-pastel-sky font-bold">
            Flight Deck
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#F1EEFF]">
            Mission Paused
          </h2>
          <p className="text-xs text-cosmic-muted">
            Cataloged {discoveredCount} of {totalCount} celestial bodies
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleResume}
            className="w-full py-3 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg text-sm font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume Flight</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-[#F1EEFF] text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Respawn at Earth Orbit</span>
          </button>
        </div>

        {/* Audio Controls */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cosmic-muted uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-pastel-mint" />
              <span>Cosmic Sound Mix</span>
            </span>
            <button
              type="button"
              onClick={toggleMute}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                muted
                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                  : "bg-white/10 text-[#F1EEFF] hover:bg-white/15"
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{muted ? "Muted" : "Mute All"}</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-cosmic-muted">
              <span>Music Volume</span>
              <span className="font-mono text-[#F1EEFF]">
                {Math.round(volumes.music * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volumes.music}
              onChange={(e) =>
                updateVolumes({ music: parseFloat(e.target.value) })
              }
              className="w-full accent-pastel-mint cursor-pointer"
            />
          </div>
        </div>

        {/* Controls Quick Reference */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-left text-xs text-cosmic-muted">
          <div className="font-bold text-cosmic-text uppercase text-[11px] flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-pastel-peach" />
            <span>Flight Controls</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div><span className="text-white font-mono">W / S</span> : Thrust / Reverse</div>
            <div><span className="text-white font-mono">A / D</span> : Steer Left / Right</div>
            <div><span className="text-white font-mono">Shift</span> : Boost Engine</div>
            <div><span className="text-white font-mono">Space</span> : Brake</div>
            <div><span className="text-white font-mono">E</span> : Scan Object</div>
            <div><span className="text-white font-mono">Mouse</span> : Look / Steer</div>
          </div>
        </div>

        {/* Navigation Link to Training */}
        <div className="pt-2 text-center">
          <Link
            href="/training"
            className="text-xs text-pastel-sky hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Return to Training Headquarters</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
