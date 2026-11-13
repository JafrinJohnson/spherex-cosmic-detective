"use client";

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  CheckCircle2,
  Award,
  ArrowRight,
  HelpCircle,
  Eye,
  Sparkles,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

interface TrainingDrill {
  id: string;
  title: string;
  targetId: string;
  targetName: string;
  prompt: string;
  clue: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const DRILLS: TrainingDrill[] = [
  {
    id: "drill-1",
    title: "Module 01 · High Proper Motion vs. Static Field",
    targetId: "barnards-star",
    targetName: "Barnard's Star",
    prompt:
      "When blinking 4 SPHEREx epochs spaced 6 months apart, one bright infrared source shifts steadily diagonally across 45 pixels while surrounding stars remain fixed. How should you classify it?",
    clue: "At 6.2 arcseconds per pixel, a steady linear shift over 1.5 years indicates large tangential velocity in the solar neighborhood.",
    options: [
      "High-Proper-Motion Nearby Star / Brown Dwarf",
      "Distant Extragalactic Supernova",
      "Static Background Giant",
    ],
    correctIndex: 0,
    explanation:
      "Correct! Barnard's Star moves at 10.3 arcseconds per year—the fastest proper motion of any star in our sky.",
  },
  {
    id: "drill-2",
    title: "Module 02 · Ultracool Brown Dwarf Spectral Troughs",
    targetId: "wise-0855",
    targetName: "WISE 0855−0714",
    prompt:
      "You spot a fast-moving source that is completely invisible in optical bands (0.75 μm) but surges in brightness near 4.5 μm with deep methane and water absorption valleys. What object have you found?",
    clue: "Objects cooler than 300 K emit almost all of their radiation in the 4–5 μm atmospheric window.",
    options: [
      "Hot White Dwarf",
      "Cold Y-Type Brown Dwarf (WISE 0855 class)",
      "Main-Sequence G Star",
    ],
    correctIndex: 1,
    explanation:
      "Spot on! WISE 0855−0714 is the coldest known brown dwarf (~250 K), glowing prominently in SPHEREx's 4.5 μm channels.",
  },
  {
    id: "drill-3",
    title: "Module 03 · Circumstellar Variable vs. Mover",
    targetId: "rw-aurigae",
    targetName: "RW Aurigae",
    prompt:
      "A source remains locked at the exact same pixel coordinates across all 4 epochs, but its infrared halo swells and dims by 40% between frames. What is this phenomenon?",
    clue: "Zero proper motion shift combined with strong flux modulation points to intrinsic stellar or dust variability.",
    options: [
      "Fast-Moving Solar System Asteroid",
      "Young Variable Star / Pulsating Giant",
      "Hot Pixel Detector Artifact",
    ],
    correctIndex: 1,
    explanation:
      "Excellent! Variable stars like RW Aurigae and R Draconis stay fixed in position while their infrared flux rises and dips over months.",
  },
];

export default function TrainingPage() {
  const [step, setStep] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const { playSound } = useSound();

  const currentDrill = DRILLS[step];
  const isCorrect = selectedOption === currentDrill.correctIndex;
  const completedCount = Object.keys(completed).length;

  const handleSelectOption = (idx: number) => {
    setSelectedOption(idx);
    if (idx === currentDrill.correctIndex) {
      playSound("success");
      setCompleted((prev) => ({ ...prev, [currentDrill.id]: true }));
      try {
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.75 },
        });
      } catch {
        // Ignore confetti errors
      }
    } else {
      playSound("click");
    }
  };

  return (
    <PageTransition className="space-y-12 pb-8">
      {/* Header Section */}
      <section className="glass p-8 sm:p-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-mint/15 border border-pastel-mint/35 text-pastel-mint">
            <GraduationCap className="w-4 h-4" />
            Cadet Calibration Academy
          </span>
          <SampleDataBadge source="placeholder" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
              Infrared Detective Training
            </h1>
            <p className="text-cosmic-muted text-base leading-relaxed">
              Master the signatures of high-proper-motion brown dwarfs, runaway
              red dwarfs, and pulsating infrared variables before vetting live
              survey fields.
            </p>
          </div>

          <div className="glass px-5 py-4 rounded-2xl flex items-center gap-3 shrink-0">
            <Award className="w-6 h-6 text-pastel-peach" />
            <div>
              <div className="text-xs font-mono uppercase text-cosmic-muted">
                Calibration Progress
              </div>
              <div className="font-heading text-lg font-bold text-cosmic-text">
                {completedCount} / {DRILLS.length} Modules Verified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Drill Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-3">
          {DRILLS.map((drill, idx) => {
            const active = idx === step;
            const done = Boolean(completed[drill.id]);
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => {
                  playSound("click");
                  setStep(idx);
                  setSelectedOption(null);
                }}
                className={`w-full text-left p-5 rounded-3xl border transition-all flex items-start justify-between gap-3 ${
                  active
                    ? "glass border-pastel-lavender shadow-glass-glow"
                    : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase text-pastel-lavender">
                    Step 0{idx + 1}
                  </div>
                  <div className="font-heading font-semibold text-sm text-cosmic-text">
                    {drill.title}
                  </div>
                  <div className="text-xs text-cosmic-muted">
                    Reference: {drill.targetName}
                  </div>
                </div>
                {done && (
                  <CheckCircle2 className="w-5 h-5 text-pastel-mint shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 glass p-7 sm:p-9 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-pastel-sky">
              {currentDrill.title}
            </span>
            <Link
              href={`/viewer?target=${currentDrill.targetId}`}
              onClick={() => playSound("whoosh")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-pastel-peach hover:underline"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect {currentDrill.targetName} in Blinker</span>
            </Link>
          </div>

          <h2 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text leading-snug">
            {currentDrill.prompt}
          </h2>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3 text-xs text-cosmic-muted">
            <HelpCircle className="w-4 h-4 text-pastel-lavender shrink-0 mt-0.5" />
            <span>
              <strong className="text-cosmic-text">Spectroscopic Hint:</strong>{" "}
              {currentDrill.clue}
            </span>
          </div>

          <div className="space-y-3">
            {currentDrill.options.map((option, idx) => {
              const chosen = selectedOption === idx;
              const right = idx === currentDrill.correctIndex;
              let stateStyle =
                "bg-white/[0.05] border-white/15 text-cosmic-text hover:bg-white/[0.1]";
              if (chosen && right) {
                stateStyle =
                  "bg-pastel-mint/20 border-pastel-mint text-cosmic-text";
              } else if (chosen && !right) {
                stateStyle =
                  "bg-pastel-peach/20 border-pastel-peach text-cosmic-text";
              }

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full text-left p-4 rounded-2xl border font-medium text-sm transition-all flex items-center justify-between ${stateStyle}`}
                >
                  <span>{option}</span>
                  {chosen && (
                    <span className="text-xs font-mono uppercase">
                      {right ? "Verified" : "Try Again"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div
              className={`p-5 rounded-2xl border text-sm leading-relaxed ${
                isCorrect
                  ? "bg-pastel-mint/10 border-pastel-mint/40 text-cosmic-text"
                  : "bg-pastel-peach/10 border-pastel-peach/40 text-cosmic-muted"
              }`}
            >
              { isCorrect ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-heading font-semibold text-pastel-mint flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Calibration Confirmed</span>
                    </div>
                    <p>{currentDrill.explanation}</p>
                  </div>

                  {step < DRILLS.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        playSound("click");
                        setStep((s) => s + 1);
                        setSelectedOption(null);
                      }}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E]"
                    >
                      <span>Next Module</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <Link
                      href="/viewer?target=wise-0855"
                      onClick={() => playSound("whoosh")}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E]"
                    >
                      <span>Start Live Blinking</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ) : (
                <p>
                  Not quite—review the astrometric motion and infrared spectral
                  clues above and select another classification.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </PageTransition>
  );
}

