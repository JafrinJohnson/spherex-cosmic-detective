"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import {
  SpotTheMover,
  type RealSkyBundle,
  type RoundOutcome,
} from "@/components/training/SpotTheMover";
import { CompareSkies } from "@/components/training/CompareSkies";
import { FoundReveal } from "@/components/training/FoundReveal";
import { useSound } from "@/components/SoundProvider";
import {
  pickRandomQuizQuestions,
  type QuizItem,
} from "@/data/quiz";

export interface MissionDef {
  id: number;
  title: string;
  subtitle: string;
  game: "spot" | "compare";
  level: 1 | 2 | 3 | 4;
  learnTitle: string;
  learnText: string;
  illustration: "spot" | "compare" | "decoy" | "timer" | "asteroid" | "telescope";
}

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    title: "First Light",
    subtitle: "Spot the Mover L1",
    game: "spot",
    level: 1,
    learnTitle: "How to Spot a Moving Object",
    learnText:
      "Astronomers blink two photos of the same patch of sky taken at different times. Fixed stars stay in place, while Solar System bodies jump between frames.",
    illustration: "spot",
  },
  {
    id: 2,
    title: "Twin Photos",
    subtitle: "Compare the Skies L1",
    game: "compare",
    level: 1,
    learnTitle: "Side-by-Side Comparison",
    learnText:
      "Comparing two sky visits side by side helps spot objects that moved or changed brightness. Look across both panels to find the difference.",
    illustration: "compare",
  },
  {
    id: 3,
    title: "Fast Neighbours",
    subtitle: "Spot the Mover L2",
    game: "spot",
    level: 2,
    learnTitle: "Tracking Nearby Asteroids",
    learnText:
      "Objects closer to Earth move across wider angles in less time. Watch carefully for faster, smaller movements across dense starfields.",
    illustration: "asteroid",
  },
  {
    id: 4,
    title: "What Changed?",
    subtitle: "Compare the Skies L2",
    game: "compare",
    level: 2,
    learnTitle: "Fluctuating Light",
    learnText:
      "Not every change is a jump in position. Variable stars and pulsing infrared objects flare or dim between observations.",
    illustration: "telescope",
  },
  {
    id: 5,
    title: "The Faint Mover",
    subtitle: "Spot the Mover L3 (with decoy)",
    game: "spot",
    level: 3,
    learnTitle: "Distinguishing Real Movers from Decoys",
    learnText:
      "Detector noise and flickering background stars can trick you. Verify the true mover that consistently shifts position.",
    illustration: "decoy",
  },
  {
    id: 6,
    title: "Planet Hunter",
    subtitle: "Compare the Skies L4 (timed)",
    game: "compare",
    level: 4,
    learnTitle: "The Final Timed Challenge",
    learnText:
      "Fast, faint, and elusive targets require quick eyes. Find every anomaly before the clock expires to complete the academy.",
    illustration: "timer",
  },
];

export interface MissionsTabProps {
  missionStars: Record<number, 1 | 2 | 3>;
  onSaveMissionStars: (missionId: number, stars: 1 | 2 | 3) => void;
  onAddPoints: (pts: number) => void;
  realSkyBundles: RealSkyBundle[];
}

type StepType = "learn" | "find" | "quiz" | "result";

function MissionIllustration({ type }: { type: MissionDef["illustration"] }) {
  switch (type) {
    case "spot":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="80" cy="60" r="50" stroke="#A2D2FF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
          <circle cx="50" cy="45" r="3" fill="#FFFFFF" opacity="0.6" />
          <circle cx="110" cy="80" r="2.5" fill="#FFFFFF" opacity="0.5" />
          <circle cx="120" cy="40" r="2" fill="#FFFFFF" opacity="0.7" />
          <circle cx="45" cy="85" r="2.5" fill="#FFFFFF" opacity="0.5" />
          <circle cx="70" cy="55" r="5" fill="#FFD166" className="animate-ping" style={{ animationDuration: "2s" }} />
          <circle cx="70" cy="55" r="5" fill="#FFD166" />
          <path d="M70 55 L92 65" stroke="#B5EAD7" strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="92" cy="65" r="5" fill="#B5EAD7" />
        </svg>
      );
    case "compare":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <rect x="15" y="20" width="58" height="80" rx="8" stroke="#A2D2FF" strokeWidth="1.5" fill="#0B0B1E" />
          <rect x="87" y="20" width="58" height="80" rx="8" stroke="#B5EAD7" strokeWidth="1.5" fill="#0B0B1E" />
          <circle cx="35" cy="45" r="3" fill="#FFFFFF" opacity="0.6" />
          <circle cx="107" cy="45" r="3" fill="#FFFFFF" opacity="0.6" />
          <circle cx="50" cy="75" r="4" fill="#FFB5A7" />
          <circle cx="122" cy="75" r="6" fill="#FFB5A7" className="animate-pulse" />
        </svg>
      );
    case "asteroid":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M50 45 Q70 20 100 35 Q125 50 115 80 Q95 105 65 95 Q35 85 50 45 Z"
            stroke="#FFB5A7"
            strokeWidth="1.8"
            fill="#FFB5A7"
            fillOpacity="0.15"
          />
          <circle cx="70" cy="55" r="4" fill="#FFB5A7" opacity="0.4" />
          <circle cx="95" cy="65" r="6" fill="#FFB5A7" opacity="0.3" />
          <path d="M125 40 L145 25" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "telescope":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="80" cy="60" r="46" stroke="#C3B1E1" strokeWidth="1.5" opacity="0.4" />
          <line x1="80" y1="14" x2="80" y2="106" stroke="#C3B1E1" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          <line x1="34" y1="60" x2="126" y2="60" stroke="#C3B1E1" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
          <circle cx="80" cy="60" r="14" stroke="#B5EAD7" strokeWidth="2" />
          <circle cx="80" cy="60" r="4" fill="#FFD166" />
        </svg>
      );
    case "decoy":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="60" r="6" fill="#FFB5A7" opacity="0.8" />
          <circle cx="110" cy="60" r="6" fill="#B5EAD7" />
          <text x="50" y="85" textAnchor="middle" fill="#FFB5A7" fontSize="10" fontFamily="sans-serif">Decoy</text>
          <text x="110" y="85" textAnchor="middle" fill="#B5EAD7" fontSize="10" fontFamily="sans-serif">Target</text>
        </svg>
      );
    case "timer":
      return (
        <svg
          viewBox="0 0 160 120"
          className="w-36 h-28 mx-auto"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="80" cy="60" r="38" stroke="#FFD166" strokeWidth="2" />
          <circle cx="80" cy="60" r="3" fill="#FFD166" />
          <line x1="80" y1="60" x2="80" y2="35" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
          <line x1="80" y1="60" x2="98" y2="60" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

export function MissionsTab({
  missionStars,
  onSaveMissionStars,
  onAddPoints,
  realSkyBundles,
}: MissionsTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  const [activeMissionId, setActiveMissionId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<StepType>("learn");

  // Mission run state
  const [findMisses, setFindMisses] = useState<number>(0);
  const [findPoints, setFindPoints] = useState<number>(0);
  const [roundOutcome, setRoundOutcome] = useState<RoundOutcome | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizItem[]>([]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizCorrectCount, setQuizCorrectCount] = useState<number>(0);
  const [showFoundReveal, setShowFoundReveal] = useState<boolean>(false);

  const activeMission =
    activeMissionId !== null
      ? MISSIONS.find((m) => m.id === activeMissionId) ?? null
      : null;

  const currentQuiz = quizQuestions[quizIndex];
  const isQuizAnswered = quizSelected !== null;
  const isQuizCorrect =
    isQuizAnswered && currentQuiz && quizSelected === currentQuiz.answer;

  const isMissionUnlocked = useCallback(
    (missionId: number) => {
      if (missionId === 1) return true;
      const prevStars = missionStars[missionId - 1];
      return typeof prevStars === "number" && prevStars > 0;
    },
    [missionStars]
  );

  const startMission = useCallback(
    (missionId: number) => {
      if (!isMissionUnlocked(missionId)) return;
      playSound("click");
      setActiveMissionId(missionId);
      setCurrentStep("learn");
      setFindMisses(0);
      setFindPoints(0);
      setRoundOutcome(null);
      setQuizQuestions(pickRandomQuizQuestions(3));
      setQuizIndex(0);
      setQuizSelected(null);
      setQuizCorrectCount(0);
      setShowFoundReveal(false);
    },
    [isMissionUnlocked, playSound]
  );

  const handleStepLearnStart = useCallback(() => {
    playSound("whoosh");
    setCurrentStep("find");
  }, [playSound]);

  // FIND handlers
  const handleFindHit = useCallback(
    (outcome: RoundOutcome) => {
      setRoundOutcome(outcome);
      setFindPoints(outcome.pointsEarned);
      onAddPoints(outcome.pointsEarned);
      // Move to quiz
      setCurrentStep("quiz");
      setQuizIndex(0);
      setQuizSelected(null);
    },
    [onAddPoints]
  );

  const handleFindMiss = useCallback(() => {
    setFindMisses((m) => m + 1);
  }, []);

  const handleCompareRoundComplete = useCallback(
    (outcome: RoundOutcome) => {
      setRoundOutcome(outcome);
      setFindPoints(outcome.pointsEarned);
      onAddPoints(outcome.pointsEarned);
      setCurrentStep("quiz");
      setQuizIndex(0);
      setQuizSelected(null);
    },
    [onAddPoints]
  );

  // QUIZ handlers
  const handleSelectQuizOption = useCallback(
    (option: string) => {
      if (quizSelected !== null) return;
      const q = quizQuestions[quizIndex];
      if (!q) return;

      setQuizSelected(option);
      const isRight = option === q.answer;

      if (isRight) {
        playSound("success");
        setQuizCorrectCount((c) => c + 1);
        onAddPoints(50);
      } else {
        playSound("wrong");
      }
    },
    [quizSelected, quizQuestions, quizIndex, playSound, onAddPoints]
  );

  const handleNextQuizQuestion = useCallback(() => {
    if (quizSelected === null) return;
    playSound("click");

    if (quizIndex + 1 < quizQuestions.length) {
      setQuizIndex((i) => i + 1);
      setQuizSelected(null);
    } else {
      // Finished all 3 questions! Trigger FoundReveal pop-up first
      setShowFoundReveal(true);
    }
  }, [quizSelected, quizIndex, quizQuestions.length, playSound]);

  // When FoundReveal closes or completes
  const handleFoundRevealClose = useCallback(() => {
    setShowFoundReveal(false);
    setCurrentStep("result");

    if (!activeMission) return;

    // Calculate stars: 3 = no misses in find & all 3 quiz correct
    // 2 = 1 miss or 2/3 quiz
    // 1 = completed
    const finalCorrect = quizCorrectCount;
    let earnedStars: 1 | 2 | 3 = 1;
    if (findMisses === 0 && finalCorrect === 3) {
      earnedStars = 3;
    } else if (findMisses <= 1 && finalCorrect >= 2) {
      earnedStars = 2;
    }

    const currentSaved = missionStars[activeMission.id] ?? 0;
    if (earnedStars > currentSaved) {
      onSaveMissionStars(activeMission.id, earnedStars);
    }
  }, [
    activeMission,
    quizCorrectCount,
    findMisses,
    missionStars,
    onSaveMissionStars,
  ]);

  // Keyboard shortcut listener for active mission steps
  useEffect(() => {
    if (activeMissionId === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (target?.closest('[role="dialog"]')) return;

      if (currentStep === "learn") {
        if (e.key === "Enter") {
          e.preventDefault();
          handleStepLearnStart();
        }
      } else if (currentStep === "quiz" && !showFoundReveal && currentQuiz) {
        if (quizSelected === null) {
          if (e.key === "1" && currentQuiz.options[0]) {
            e.preventDefault();
            handleSelectQuizOption(currentQuiz.options[0]);
          } else if (e.key === "2" && currentQuiz.options[1]) {
            e.preventDefault();
            handleSelectQuizOption(currentQuiz.options[1]);
          } else if (e.key === "3" && currentQuiz.options[2]) {
            e.preventDefault();
            handleSelectQuizOption(currentQuiz.options[2]);
          } else if (e.key === "4" && currentQuiz.options[3]) {
            e.preventDefault();
            handleSelectQuizOption(currentQuiz.options[3]);
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleNextQuizQuestion();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeMissionId,
    currentStep,
    showFoundReveal,
    quizSelected,
    currentQuiz,
    handleStepLearnStart,
    handleSelectQuizOption,
    handleNextQuizQuestion,
  ]);

  // ==========================================
  // VIEW: MISSION MAP (when no mission is open)
  // ==========================================
  if (activeMissionId === null) {
    return (
      <div className="glass p-6 sm:p-10 space-y-8 relative overflow-hidden border border-white/15">
        {/* Starry map background decoration */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(1.5px 1.5px at 20px 30px, #FFFFFF, rgba(0,0,0,0)), radial-gradient(1px 1px at 80px 140px, #A2D2FF, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 220px 70px, #FFD166, rgba(0,0,0,0)), radial-gradient(1px 1px at 340px 190px, #B5EAD7, rgba(0,0,0,0))",
            backgroundSize: "400px 300px",
          }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
              Mission Map
            </h2>
            <p className="text-base text-cosmic-muted mt-1">
              Progress through 6 detective assignments. Learn the science, find the target, ace the quiz.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/15 font-mono text-sm">
            <Star className="w-4 h-4 fill-[#FFD166] text-[#FFD166]" />
            <span className="text-cosmic-text font-semibold">
              {Object.values(missionStars).reduce((acc, v) => acc + v, 0)} / 18 Stars
            </span>
          </div>
        </div>

        {/* 6 Mission Nodes connected by Glowing Dotted Line (horizontal on desktop, vertical on mobile) */}
        <div className="relative z-10 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3 relative">
            {/* Desktop Glowing Dotted Connector (horizontal) */}
            <div
              className="hidden md:block absolute top-[44px] left-[5%] right-[5%] h-[3px] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, #B5EAD7 0, #B5EAD7 6px, transparent 6px, transparent 14px)",
                opacity: 0.65,
                filter: "drop-shadow(0 0 6px rgba(181,234,215,0.8))",
              }}
            />

            {/* Mobile Glowing Dotted Connector (vertical) */}
            <div
              className="md:hidden absolute top-[44px] bottom-[44px] left-1/2 -translate-x-1/2 w-[3px] pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, #B5EAD7 0, #B5EAD7 6px, transparent 6px, transparent 14px)",
                opacity: 0.65,
                filter: "drop-shadow(0 0 6px rgba(181,234,215,0.8))",
              }}
            />

            {MISSIONS.map((mission) => {
              const unlocked = isMissionUnlocked(mission.id);
              const stars = missionStars[mission.id] || 0;
              const isDone = stars > 0;
              const isOpen = unlocked && !isDone;

              return (
                <div
                  key={mission.id}
                  className="flex flex-col items-center text-center gap-3 relative z-10 w-full md:w-auto"
                >
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => startMission(mission.id)}
                    className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 flex flex-col items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${
                      isDone
                        ? "bg-gradient-to-br from-[#B5EAD7]/30 to-[#A2D2FF]/30 border-[#B5EAD7] shadow-[0_0_24px_rgba(181,234,215,0.4)] cursor-pointer hover:scale-105"
                        : isOpen
                          ? "bg-[#0B0B1E] border-pastel-mint shadow-[0_0_30px_rgba(181,234,215,0.6)] cursor-pointer hover:scale-105 animate-pulse"
                          : "bg-white/[0.03] border-white/20 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-8 h-8 text-[#B5EAD7]" />
                    ) : isOpen ? (
                      <Play className="w-7 h-7 text-pastel-mint ml-1" />
                    ) : (
                      <Lock className="w-6 h-6 text-cosmic-muted" />
                    )}

                    <span className="font-mono text-xs font-bold text-cosmic-text mt-0.5">
                      M{mission.id}
                    </span>
                  </button>

                  {/* Stars earned for this node */}
                  <div className="flex items-center gap-1 min-h-[20px]">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-4 h-4 ${
                          starIdx <= stars
                            ? "fill-[#FFD166] text-[#FFD166] drop-shadow-[0_0_6px_rgba(255,209,102,0.8)]"
                            : "text-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Node label */}
                  <div className="space-y-0.5 max-w-[130px]">
                    <div className="font-heading text-sm sm:text-base font-bold text-cosmic-text leading-tight">
                      {mission.title}
                    </div>
                    <div className="text-xs text-cosmic-muted leading-tight">
                      {mission.subtitle}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: ACTIVE MISSION (Learn · Find · Quiz · Result)
  // ==========================================
  if (!activeMission) return null;

  return (
    <div className="space-y-6">
      {/* Top Mission Header & Step Bar */}
      <div className="glass p-5 sm:p-6 space-y-4 border border-white/15">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setActiveMissionId(null);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-cosmic-text inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Map</span>
            </button>

            <div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text">
                Mission {activeMission.id}: {activeMission.title}
              </h2>
              <p className="text-xs text-cosmic-muted">{activeMission.subtitle}</p>
            </div>
          </div>

          {/* Step Bar (Learn · Find · Quiz) */}
          <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-white/[0.04] border border-white/15 text-xs sm:text-sm font-medium font-heading">
            <span
              className={`px-3 py-1 rounded-full ${
                currentStep === "learn"
                  ? "bg-pastel-mint text-[#0B0B1E] font-bold"
                  : "text-cosmic-muted"
              }`}
            >
              1. Learn
            </span>
            <span className="text-white/20">·</span>
            <span
              className={`px-3 py-1 rounded-full ${
                currentStep === "find"
                  ? "bg-pastel-mint text-[#0B0B1E] font-bold"
                  : "text-cosmic-muted"
              }`}
            >
              2. Find
            </span>
            <span className="text-white/20">·</span>
            <span
              className={`px-3 py-1 rounded-full ${
                currentStep === "quiz" || currentStep === "result"
                  ? "bg-pastel-mint text-[#0B0B1E] font-bold"
                  : "text-cosmic-muted"
              }`}
            >
              3. Quiz
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: LEARN */}
      {currentStep === "learn" && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 sm:p-12 max-w-2xl mx-auto text-center space-y-6 border border-[#B5EAD7]/45"
        >
          <div className="w-36 h-28 mx-auto flex items-center justify-center">
            <MissionIllustration type={activeMission.illustration} />
          </div>

          <div className="space-y-3">
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
              {activeMission.learnTitle}
            </h3>
            <p className="text-base sm:text-lg text-cosmic-muted leading-relaxed max-w-lg mx-auto">
              {activeMission.learnText}
            </p>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleStepLearnStart}
              className="min-h-[44px] px-8 py-3 rounded-full font-heading font-bold text-base bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center gap-2 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-mint"
            >
              <span>Start</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: FIND (The matching game at the matching level) */}
      {currentStep === "find" && (
        <div className="max-w-4xl mx-auto">
          {activeMission.game === "spot" ? (
            <SpotTheMover
              moversFound={0}
              roundNumber={activeMission.id}
              forcedLevel={activeMission.level as 1 | 2 | 3}
              suppressInternalReveal={true}
              realSkyBundles={realSkyBundles}
              onHit={handleFindHit}
              onMiss={handleFindMiss}
              onUseHint={() => {}}
              onNextSky={() => {}}
              hintTriggerSeq={0}
            />
          ) : (
            <CompareSkies
              compareRoundsCompleted={0}
              roundNumber={activeMission.id}
              forcedLevel={activeMission.level}
              suppressInternalReveal={true}
              onChangeFound={() => {}}
              onMiss={handleFindMiss}
              onDeductPoints={() => {}}
              onRoundComplete={handleCompareRoundComplete}
              onNextRound={() => {}}
              hintTriggerSeq={0}
              blinkTriggerSeq={0}
            />
          )}
        </div>
      )}

      {/* STEP 3: QUIZ (3 Multiple choice questions, 1 at a time, each with picture) */}
      {currentStep === "quiz" && currentQuiz && (
        <div className="glass p-6 sm:p-8 max-w-2xl mx-auto space-y-6 border border-white/15">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10 text-sm font-mono text-cosmic-muted">
            <span>
              Mission {activeMission.id} Quiz · Question {quizIndex + 1} of 3
            </span>
            <span className="text-[#FFD166]">{quizCorrectCount} of 3 correct</span>
          </div>

          {/* Picture + Question */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 bg-[#07061A] shrink-0 relative shadow-md">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url(${
                    quizIndex === 0 && roundOutcome?.snapshotDataUrl
                      ? roundOutcome.snapshotDataUrl
                      : currentQuiz.image ?? "/textures/jupiter.jpg"
                  })`,
                }}
              />
            </div>

            <h3 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text leading-snug">
              {currentQuiz.question}
            </h3>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuiz.options.map((opt, idx) => {
              const isSelected = quizSelected === opt;
              const isRightOption = opt === currentQuiz.answer;

              let cardStyle =
                "bg-white/[0.05] hover:bg-white/[0.11] border-white/15 text-cosmic-text";

              if (isQuizAnswered) {
                if (isRightOption) {
                  cardStyle =
                    "bg-[#B5EAD7]/20 border-[#B5EAD7] text-[#B5EAD7] shadow-[0_0_20px_rgba(181,234,215,0.2)]";
                } else if (isSelected) {
                  cardStyle =
                    "bg-[#FFB5A7]/20 border-[#FFB5A7] text-[#FFB5A7] shadow-[0_0_20px_rgba(255,181,167,0.2)]";
                } else {
                  cardStyle =
                    "bg-white/[0.02] border-white/10 text-cosmic-muted opacity-60";
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isQuizAnswered}
                  onClick={() => handleSelectQuizOption(opt)}
                  className={`w-full min-h-[44px] px-4 py-3.5 rounded-2xl border text-left text-base font-medium flex items-center justify-between gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${cardStyle}`}
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center font-mono text-sm text-cosmic-muted shrink-0">
                      {idx + 1}
                    </span>
                    <span>{opt}</span>
                  </span>

                  {isQuizAnswered && isRightOption && (
                    <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#B5EAD7] shrink-0">
                      <Check className="w-4 h-4" />
                      <span>{isSelected ? "+50" : "Correct"}</span>
                    </span>
                  )}

                  {isQuizAnswered && isSelected && !isRightOption && (
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-[#FFB5A7] shrink-0">
                      <X className="w-4 h-4" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Feedback Banner */}
          {isQuizAnswered && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isQuizCorrect
                  ? "bg-[#B5EAD7]/12 border-[#B5EAD7]/60 text-cosmic-text"
                  : "bg-[#FFB5A7]/12 border-[#FFB5A7]/60 text-cosmic-text"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-heading font-bold text-base">
                  {isQuizCorrect ? (
                    <>
                      <Sparkles className="w-4 h-4 text-[#B5EAD7]" />
                      <span className="text-[#B5EAD7]">Correct! +50 pts</span>
                    </>
                  ) : (
                    <span className="text-[#FFB5A7]">Not quite</span>
                  )}
                </div>
                <p className="text-sm text-cosmic-muted">{currentQuiz.explanation}</p>
                {!isQuizCorrect && (
                  <p className="text-sm font-medium text-[#B5EAD7]">
                    Right answer: {currentQuiz.answer}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextQuizQuestion}
                className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-semibold text-sm bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center justify-center gap-2 shrink-0 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-mint"
              >
                <span>
                  {quizIndex + 1 < quizQuestions.length
                    ? "Next question"
                    : "Complete mission"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* STEP 4: RESULT CARD (after FoundReveal 3D pop-up) */}
      {currentStep === "result" && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 sm:p-10 max-w-2xl mx-auto text-center space-y-6 border border-[#B5EAD7]/50"
        >
          <div className="space-y-2">
            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
              Mission {activeMission.id} Complete!
            </h3>
            <p className="text-base text-cosmic-muted">
              {activeMission.title} · {activeMission.subtitle}
            </p>
          </div>

          {/* Stars Earned */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[1, 2, 3].map((starIdx) => {
              const currentStars = missionStars[activeMission.id] ?? 1;
              const hasStar = starIdx <= currentStars;
              return (
                <div
                  key={starIdx}
                  className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                    hasStar
                      ? "bg-[#FFD166]/20 border-[#FFD166] shadow-[0_0_20px_rgba(255,209,102,0.5)]"
                      : "bg-white/[0.04] border-white/15"
                  }`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      hasStar
                        ? "fill-[#FFD166] text-[#FFD166]"
                        : "text-white/20"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
              <div className="text-sm text-cosmic-muted">Points earned</div>
              <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#FFD166] mt-1">
                +{findPoints + quizCorrectCount * 50}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
              <div className="text-sm text-cosmic-muted">Quiz accuracy</div>
              <div className="font-mono text-2xl sm:text-3xl font-semibold text-[#B5EAD7] mt-1">
                {quizCorrectCount} / 3
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                startMission(activeMission.id);
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-medium text-sm bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-cosmic-text inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Replay mission</span>
            </button>

            {activeMission.id < MISSIONS.length ? (
              <button
                type="button"
                onClick={() => {
                  playSound("whoosh");
                  startMission(activeMission.id + 1);
                }}
                className="min-h-[44px] px-8 py-2.5 rounded-full font-heading font-bold text-sm bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center gap-2"
              >
                <span>Next mission</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setActiveMissionId(null);
                }}
                className="min-h-[44px] px-8 py-2.5 rounded-full font-heading font-bold text-sm bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center gap-2"
              >
                <span>Back to map</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* 3D FoundReveal pop-up between Quiz and Result */}
      {roundOutcome && (
        <FoundReveal
          open={showFoundReveal}
          objectType={roundOutcome.objectType ?? "asteroid"}
          pointsEarned={roundOutcome.pointsEarned}
          onNext={handleFoundRevealClose}
          onClose={handleFoundRevealClose}
        />
      )}
    </div>
  );
}
