"use client";

import React, { useState, useEffect } from "react";
import {
  Rocket,
  Compass,
  Radio,
  Keyboard,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAudio } from "@/context/AudioProvider";

interface VoyageStartModalProps {
  onStart: () => void;
  discoveredCount: number;
  totalCount: number;
}

export function VoyageStartModal({
  onStart,
  discoveredCount,
  totalCount,
}: VoyageStartModalProps) {
  const { playSound } = useAudio();
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleLaunch = () => {
    playSound("click");
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      playSound("click");
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      playSound("whoosh");
      onStart();
    }
  }, [countdown, onStart, playSound]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080816]/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl glass-panel rounded-3xl border border-pastel-mint/30 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Glow icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pastel-mint/20 to-pastel-sky/20 border border-pastel-mint/40 flex items-center justify-center mx-auto text-pastel-mint shadow-lg shadow-pastel-mint/10">
          <Rocket className="w-8 h-8" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastel-mint/10 border border-pastel-mint/30 text-xs font-bold text-pastel-mint tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            SPHEREx Recon Scout
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-[#F1EEFF] tracking-tight">
            Cosmic Voyage
          </h1>
          <p className="text-xs sm:text-sm text-cosmic-muted max-w-md mx-auto leading-relaxed">
            Navigate through our planetary system in 3D. Fly near planets, moons, and dwarf planets, activate your infrared scanner, and solve cosmic quizzes to earn discoveries!
          </p>
        </div>

        {/* Mission Objectives Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-pastel-sky text-xs font-bold font-heading">
              <Compass className="w-4 h-4" />
              <span>14 Targets</span>
            </div>
            <p className="text-[11px] text-cosmic-muted leading-snug">
              From the Sun to distant dwarf planet Eris.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-pastel-mint text-xs font-bold font-heading">
              <Radio className="w-4 h-4" />
              <span>Spectra Scan</span>
            </div>
            <p className="text-[11px] text-cosmic-muted leading-snug">
              Approach targets and hold [E] to scan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-pastel-peach text-xs font-bold font-heading">
              <Sparkles className="w-4 h-4" />
              <span>Earn Badges</span>
            </div>
            <p className="text-[11px] text-cosmic-muted leading-snug">
              Unlock the prestigious Voyager Badge!
            </p>
          </div>
        </div>

        {/* Flight Controls Summary */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-cosmic-text space-y-2 text-left">
          <div className="text-[11px] font-bold text-cosmic-muted uppercase tracking-wider flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-pastel-sky" />
            <span>Pilot Flight Controls</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="font-mono text-pastel-sky font-bold">W / ↑</span> : Thrust
            </div>
            <div>
              <span className="font-mono text-pastel-sky font-bold">A / D</span> : Steer
            </div>
            <div>
              <span className="font-mono text-pastel-peach font-bold">Shift</span> : Boost
            </div>
            <div>
              <span className="font-mono text-pastel-mint font-bold">E</span> : Scan
            </div>
          </div>
          <div className="text-[10px] text-cosmic-muted pt-1 flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-pastel-mint" />
            <span>Mobile users: Virtual joystick & flight buttons appear automatically.</span>
          </div>
        </div>

        {/* Launch Button or Countdown */}
        <div className="pt-2">
          {countdown !== null ? (
            <div className="py-3 text-4xl sm:text-5xl font-heading font-bold text-pastel-mint animate-ping">
              {countdown > 0 ? countdown : "LAUNCH!"}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-gradient-to-r from-pastel-mint via-pastel-sky to-pastel-peach text-cosmic-bg text-base font-bold shadow-xl hover:shadow-pastel-mint/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 mx-auto"
            >
              <span>Launch Recon Mission</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {discoveredCount > 0 && (
            <div className="text-xs text-cosmic-muted mt-3">
              Previously cataloged: {discoveredCount} of {totalCount} celestial bodies.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
