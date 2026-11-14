"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { Award, Sparkles, Compass } from "lucide-react";
import { useAudio } from "@/context/AudioProvider";

interface VoyageCompleteModalProps {
  onContinue: () => void;
  totalScore: number;
}

export function VoyageCompleteModal({
  onContinue,
  totalScore,
}: VoyageCompleteModalProps) {
  const { playSound } = useAudio();

  useEffect(() => {
    playSound("levelup");
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }
  }, [playSound]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080816]/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-pastel-mint/40 shadow-2xl p-6 sm:p-8 space-y-6 text-center">
        {/* Badge Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pastel-mint via-pastel-sky to-pastel-peach p-1 mx-auto shadow-xl shadow-pastel-mint/20 animate-bounce">
          <div className="w-full h-full rounded-full bg-cosmic-bg flex items-center justify-center text-pastel-mint">
            <Award className="w-10 h-10" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastel-mint/15 border border-pastel-mint/30 text-xs font-bold text-pastel-mint uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Solar System Mastered
          </div>
          <h2 className="text-3xl font-heading font-bold text-[#F1EEFF]">
            Voyager Badge Unlocked!
          </h2>
          <p className="text-xs sm:text-sm text-cosmic-muted max-w-sm mx-auto leading-relaxed">
            Astounding piloting, Detective! You have discovered, scanned, and cataloged all 14 celestial bodies across the Solar System.
          </p>
        </div>

        {/* Stats card */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-center">
          <div>
            <div className="text-[11px] text-cosmic-muted uppercase font-bold">
              Bodies Cataloged
            </div>
            <div className="text-2xl font-heading font-bold text-pastel-mint">
              14 / 14
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <div className="text-[11px] text-cosmic-muted uppercase font-bold">
              Mission Score
            </div>
            <div className="text-2xl font-heading font-bold text-pastel-peach">
              {totalScore} PTS
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg text-sm font-bold shadow-lg hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Continue Free Exploration</span>
          </button>

          <Link
            href="/training"
            className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-[#F1EEFF] text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <span>View Badges on Training Deck</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
