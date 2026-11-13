"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, HelpCircle, ArrowRight } from "lucide-react";
import type { RoundOutcome } from "@/components/training/SpotTheMover";
import { useSound } from "@/components/SoundProvider";

export type QuizQuestionType = "direction" | "brightness" | "count";

interface QuizCardProps {
  lastOutcome: RoundOutcome | null;
  onAnswerCorrect: (questionType: QuizQuestionType) => void;
  onNextSky: () => void;
}

export function QuizCard({
  lastOutcome,
  onAnswerCorrect,
  onNextSky,
}: QuizCardProps) {
  const { playSound } = useSound();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Reset choice when a new round outcome arrives
  useEffect(() => {
    setSelectedIdx(null);
  }, [lastOutcome?.roundId]);

  const questionData = useMemo(() => {
    if (!lastOutcome) return null;

    // Rotate question types across rounds; prioritize brightness question when a decoy is active or on every 2nd round
    const mod = lastOutcome.roundId % 3;
    let qType: QuizQuestionType = "direction";
    if (lastOutcome.hasDecoy || mod === 2) {
      qType = "brightness";
    } else if (mod === 0) {
      qType = "count";
    } else {
      qType = "direction";
    }

    if (qType === "direction") {
      // Deterministic option order based on roundId
      const shiftOrder = lastOutcome.roundId % 2 === 0;
      const options = shiftOrder
        ? [
            lastOutcome.directionWords,
            lastOutcome.oppositeDirectionWords,
            "It did not move",
          ]
        : [
            lastOutcome.oppositeDirectionWords,
            lastOutcome.directionWords,
            "It did not move",
          ];
      const correctIndex = shiftOrder ? 0 : 1;

      return {
        type: "direction" as const,
        prompt: "In the clip you just watched, which way did the mover travel?",
        options,
        correctIndex,
        explanation: `The mover shifted ${lastOutcome.directionWords.toLowerCase()} between Photo A and Photo B.`,
      };
    }

    if (qType === "brightness") {
      const options = lastOutcome.hasDecoy
        ? [
            "The target moved position (and a decoy star only changed brightness)",
            "It stayed in the exact same spot and only dimmed",
            "All stars stayed completely still and constant",
          ]
        : [
            "It stayed still and only changed brightness",
            "It moved position between Photo A and Photo B",
            "Neither — it was a static background star",
          ];
      const correctIndex = lastOutcome.hasDecoy ? 0 : 1;

      return {
        type: "brightness" as const,
        prompt: "Did the object move, or change brightness?",
        options,
        correctIndex,
        explanation: lastOutcome.hasDecoy
          ? "True movers shift coordinates across visits, whereas variable decoy stars stay fixed while pulsing in brightness."
          : "The target shifted pixel coordinates between visits rather than merely pulsing in place.",
      };
    }

    // qType === "count"
    return {
      type: "count" as const,
      prompt: "How many photos were compared?",
      options: ["2", "4", "6"],
      correctIndex: 0,
      explanation:
        "Two visits (Photo A and Photo B) were blinked back and forth to reveal the shift.",
    };
  }, [lastOutcome]);

  const handleSelectOption = useCallback(
    (idx: number) => {
      if (!questionData || selectedIdx !== null) return;
      setSelectedIdx(idx);

      if (idx === questionData.correctIndex) {
        playSound("success");
        onAnswerCorrect(questionData.type);
      } else {
        playSound("click");
      }
    },
    [questionData, selectedIdx, playSound, onAnswerCorrect]
  );

  // Keyboard shortcuts: 1 / 2 / 3 = quiz answers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!questionData || selectedIdx !== null) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "1") {
        e.preventDefault();
        handleSelectOption(0);
      } else if (e.key === "2") {
        e.preventDefault();
        handleSelectOption(1);
      } else if (e.key === "3") {
        e.preventDefault();
        handleSelectOption(2);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [questionData, selectedIdx, handleSelectOption]);

  return (
    <div className="glass p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#FFC8DD]">
          WHAT DID YOU SEE?
        </span>
        {questionData && (
          <span className="text-[11px] font-mono text-cosmic-muted">
            Keys 1 · 2 · 3
          </span>
        )}
      </div>

      {!questionData ? (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-3 text-xs sm:text-sm text-cosmic-muted">
          <HelpCircle className="w-5 h-5 text-[#FFC8DD] shrink-0" />
          <span>
            Tap the moving dot in the star field first to unlock this round&apos;s
            observation quiz (+50 bonus points).
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-heading text-base sm:text-lg font-bold text-cosmic-text leading-snug">
            {questionData.prompt}
          </h3>

          <div className="space-y-2.5">
            {questionData.options.map((opt, idx) => {
              const answered = selectedIdx !== null;
              const isChosen = selectedIdx === idx;
              const isRight = idx === questionData.correctIndex;

              let rowStyle =
                "bg-white/[0.05] hover:bg-white/[0.1] border-white/15 text-cosmic-text";
              if (answered) {
                if (isRight) {
                  rowStyle =
                    "bg-[#B5EAD7]/20 border-[#B5EAD7] text-cosmic-text";
                } else if (isChosen && !isRight) {
                  rowStyle =
                    "bg-[#FFB5A7]/20 border-[#FFB5A7] text-cosmic-text";
                } else {
                  rowStyle =
                    "bg-white/[0.03] border-white/10 text-cosmic-muted opacity-65";
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={answered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full min-h-[44px] px-4 py-3 rounded-2xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-pink ${rowStyle}`}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-[11px] font-mono flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{opt}</span>
                  </span>

                  {answered && isRight && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B5EAD7] shrink-0">
                      <Check className="w-4 h-4" />
                      {isChosen && <span>+50 points</span>}
                    </span>
                  )}

                  {answered && isChosen && !isRight && (
                    <X className="w-4 h-4 text-[#FFB5A7] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedIdx !== null && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3 text-xs">
              <p className="text-cosmic-muted leading-relaxed">
                {questionData.explanation}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-pastel-lavender">
                  Next question waits for next round
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playSound("whoosh");
                    onNextSky();
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-full font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
                >
                  <span>Next sky</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

