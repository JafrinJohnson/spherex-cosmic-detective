"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Keyboard,
  Crosshair,
  Columns2,
} from "lucide-react";
import { getTargets, getFrames } from "@/lib/api";
import {
  SpotTheMover,
  type RoundOutcome,
  type RealSkyBundle,
} from "@/components/training/SpotTheMover";
import { CompareSkies } from "@/components/training/CompareSkies";
import {
  QuizCard,
  type QuizQuestionType,
} from "@/components/training/QuizCard";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const TRAINING_STORAGE_KEY = "cosmic-detective-training-progress-v1";
const TRAINING_TAB_STORAGE_KEY = "cosmic-detective-training-tab-v1";

export type TrainingGameTab = "spot" | "compare";

export type BadgeId =
  | "cadet"
  | "observer"
  | "planet-hunter"
  | "sharp-eye"
  | "quick-draw"
  | "variable-spotter"
  | "change-finder";

interface BadgeDef {
  id: BadgeId;
  name: string;
  requirement: string;
  gradient: string;
}

const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: "cadet",
    name: "Cadet",
    requirement: "Start training",
    gradient: "from-[#A2D2FF] to-[#C3B1E1]",
  },
  {
    id: "observer",
    name: "Observer",
    requirement: "Reach 300 pts",
    gradient: "from-[#B5EAD7] to-[#A2D2FF]",
  },
  {
    id: "planet-hunter",
    name: "Planet Hunter",
    requirement: "Reach 1000 pts",
    gradient: "from-[#FF8A65] to-[#FFD166]",
  },
  {
    id: "sharp-eye",
    name: "Sharp Eye",
    requirement: "5 finds in a row, no miss",
    gradient: "from-[#C3B1E1] to-[#FFC8DD]",
  },
  {
    id: "quick-draw",
    name: "Quick Draw",
    requirement: "Find in under 3 s",
    gradient: "from-[#FFD166] to-[#FFB5A7]",
  },
  {
    id: "variable-spotter",
    name: "Variable Spotter",
    requirement: "Brightness quiz correct",
    gradient: "from-[#FFC8DD] to-[#B5EAD7]",
  },
  {
    id: "change-finder",
    name: "Change Finder",
    requirement: "Complete 5 Compare rounds",
    gradient: "from-[#A2D2FF] to-[#B5EAD7]",
  },
];

function BadgeSvgIcon({ id }: { id: BadgeId }) {
  switch (id) {
    case "cadet":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3L14.8 8.6L21 9.5L16.5 13.9L17.6 20L12 17.1L6.4 20L7.5 13.9L3 9.5L9.2 8.6L12 3Z"
            stroke="#0B0B1E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "observer":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="#0B0B1E" strokeWidth="2" />
          <path
            d="M2 12C4.5 7 8 4.5 12 4.5C16 4.5 19.5 7 22 12C19.5 17 16 19.5 12 19.5C8 19.5 4.5 17 2 12Z"
            stroke="#0B0B1E"
            strokeWidth="2"
          />
        </svg>
      );
    case "planet-hunter":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="5.5" stroke="#0B0B1E" strokeWidth="2" />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="3.5"
            transform="rotate(-22 12 12)"
            stroke="#0B0B1E"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "sharp-eye":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="#0B0B1E" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" fill="#0B0B1E" />
          <path
            d="M12 2V5M12 19V22M2 12H5M19 12H22"
            stroke="#0B0B1E"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "quick-draw":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13 2L4 14H12L11 22L20 10H12L13 2Z"
            stroke="#0B0B1E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "variable-spotter":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2 12H5L8 5L12 19L16 8L19 12H22"
            stroke="#0B0B1E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "change-finder":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="4"
            width="7.5"
            height="16"
            rx="2"
            stroke="#0B0B1E"
            strokeWidth="2"
          />
          <rect
            x="13.5"
            y="4"
            width="7.5"
            height="16"
            rx="2"
            stroke="#0B0B1E"
            strokeWidth="2"
          />
          <circle cx="6.75" cy="9.5" r="1.5" fill="#0B0B1E" />
          <circle cx="17.25" cy="14.5" r="1.5" fill="#0B0B1E" />
        </svg>
      );
  }
}

function useAnimatedCount(targetValue: number, durationMs = 420): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const prevRef = useRef<number>(targetValue);

  useEffect(() => {
    const startVal = prevRef.current;
    const diff = targetValue - startVal;
    if (diff === 0) return;

    const startTime = performance.now();
    let rafId = 0;

    const update = (now: number) => {
      const p = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayValue(Math.round(startVal + diff * eased));
      if (p < 1) {
        rafId = window.requestAnimationFrame(update);
      } else {
        prevRef.current = targetValue;
      }
    };

    rafId = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(rafId);
  }, [targetValue, durationMs]);

  return displayValue;
}

interface StoredTrainingProgress {
  score: number;
  moversFound: number;
  compareRoundsCompleted?: number;
  streak: number;
  bestTimeSec: number | null;
  unlockedBadges: BadgeId[];
  roundNumber: number;
}

export default function TrainingPage() {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  // Active Game Tab ("spot" | "compare"), persisted in localStorage
  const [activeTab, setActiveTab] = useState<TrainingGameTab>("spot");

  // Persisted progress states
  const [score, setScore] = useState<number>(0);
  const [moversFound, setMoversFound] = useState<number>(0);
  const [compareRoundsCompleted, setCompareRoundsCompleted] =
    useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestTimeSec, setBestTimeSec] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeId[]>(["cadet"]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Active round quiz & modal states
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);
  const [newlyUnlockedBadge, setNewlyUnlockedBadge] =
    useState<BadgeDef | null>(null);
  const [howToPlayOpen, setHowToPlayOpen] = useState<boolean>(false);
  const [resetModalOpen, setResetModalOpen] = useState<boolean>(false);
  const [hintTriggerSeq, setHintTriggerSeq] = useState<number>(0);
  const [blinkTriggerSeq, setBlinkTriggerSeq] = useState<number>(0);

  // Real sky bundles loaded from getTargets() + getFrames()
  const [realSkyBundles, setRealSkyBundles] = useState<RealSkyBundle[]>([]);

  const animatedScore = useAnimatedCount(score);
  const animatedFinds = useAnimatedCount(moversFound);

  // Load saved progress & tab from localStorage + load real sky frames
  useEffect(() => {
    try {
      const savedTab = window.localStorage.getItem(TRAINING_TAB_STORAGE_KEY);
      if (savedTab === "spot" || savedTab === "compare") {
        setActiveTab(savedTab);
      }

      const raw = window.localStorage.getItem(TRAINING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredTrainingProgress;
        if (typeof parsed.score === "number") setScore(parsed.score);
        if (typeof parsed.moversFound === "number")
          setMoversFound(parsed.moversFound);
        if (typeof parsed.compareRoundsCompleted === "number") {
          setCompareRoundsCompleted(parsed.compareRoundsCompleted);
        }
        if (typeof parsed.streak === "number") setStreak(parsed.streak);
        if (
          parsed.bestTimeSec === null ||
          typeof parsed.bestTimeSec === "number"
        ) {
          setBestTimeSec(parsed.bestTimeSec);
        }
        if (
          Array.isArray(parsed.unlockedBadges) &&
          parsed.unlockedBadges.length > 0
        ) {
          setUnlockedBadges(parsed.unlockedBadges);
        }
        if (typeof parsed.roundNumber === "number" && parsed.roundNumber >= 1) {
          setRoundNumber(parsed.roundNumber);
        }
      }
    } catch {
      // Ignore storage access errors
    }
    setHydrated(true);

    let active = true;
    getTargets().then(async (targets) => {
      if (!active) return;
      const bundles = await Promise.all(
        targets.map(async (target) => {
          const meta = await getFrames(target.id);
          return { target, meta };
        })
      );
      if (active) setRealSkyBundles(bundles);
    });

    return () => {
      active = false;
    };
  }, []);

  // Save progress to localStorage whenever state updates
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: StoredTrainingProgress = {
        score,
        moversFound,
        compareRoundsCompleted,
        streak,
        bestTimeSec,
        unlockedBadges,
        roundNumber,
      };
      window.localStorage.setItem(
        TRAINING_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // Ignore storage errors
    }
  }, [
    hydrated,
    score,
    moversFound,
    compareRoundsCompleted,
    streak,
    bestTimeSec,
    unlockedBadges,
    roundNumber,
  ]);

  const handleSelectTab = useCallback(
    (tab: TrainingGameTab) => {
      playSound("click");
      setActiveTab(tab);
      try {
        window.localStorage.setItem(TRAINING_TAB_STORAGE_KEY, tab);
      } catch {
        // Ignore storage errors
      }
    },
    [playSound]
  );

  // Helper to check and unlock badges with celebration modal
  const checkAndUnlockBadges = useCallback(
    (params: {
      nextScore: number;
      nextStreak: number;
      nextCompareRounds?: number;
      solveTimeSec?: number;
      answeredBrightnessCorrectly?: boolean;
    }) => {
      setUnlockedBadges((prev) => {
        const nextList = [...prev];
        let freshlyUnlocked: BadgeDef | null = null;

        const tryUnlock = (id: BadgeId) => {
          if (!nextList.includes(id)) {
            nextList.push(id);
            const def = BADGE_DEFINITIONS.find((b) => b.id === id) ?? null;
            if (def) freshlyUnlocked = def;
          }
        };

        if (params.nextScore >= 300) tryUnlock("observer");
        if (params.nextScore >= 1000) tryUnlock("planet-hunter");
        if (params.nextStreak >= 5) tryUnlock("sharp-eye");
        if (
          params.solveTimeSec !== undefined &&
          params.solveTimeSec < 3.0
        ) {
          tryUnlock("quick-draw");
        }
        if (params.answeredBrightnessCorrectly) {
          tryUnlock("variable-spotter");
        }
        if (
          params.nextCompareRounds !== undefined &&
          params.nextCompareRounds >= 5
        ) {
          tryUnlock("change-finder");
        }

        if (freshlyUnlocked) {
          setNewlyUnlockedBadge(freshlyUnlocked);
          playSound("success");
          try {
            confetti({
              particleCount: 70,
              spread: 75,
              origin: { y: 0.55 },
            });
          } catch {
            // Ignore confetti errors
          }
        }

        return nextList;
      });
    },
    [playSound]
  );

  const handleHit = useCallback(
    (outcome: RoundOutcome) => {
      const nextScore = score + outcome.pointsEarned;
      const nextFinds = moversFound + 1;
      const nextStreak = outcome.missedInRound ? 1 : streak + 1;
      const nextBest =
        bestTimeSec === null
          ? outcome.elapsedSeconds
          : Math.min(bestTimeSec, outcome.elapsedSeconds);

      setScore(nextScore);
      setMoversFound(nextFinds);
      setStreak(nextStreak);
      setBestTimeSec(nextBest);
      setLastOutcome(outcome);

      checkAndUnlockBadges({
        nextScore,
        nextStreak,
        nextCompareRounds: compareRoundsCompleted,
        solveTimeSec: outcome.elapsedSeconds,
      });
    },
    [
      score,
      moversFound,
      streak,
      bestTimeSec,
      compareRoundsCompleted,
      checkAndUnlockBadges,
    ]
  );

  // Compare the Skies handlers
  const handleCompareChangeFound = useCallback(
    (pts: number) => {
      const nextScore = score + pts;
      setScore(nextScore);
      checkAndUnlockBadges({
        nextScore,
        nextStreak: streak,
        nextCompareRounds: compareRoundsCompleted,
      });
    },
    [score, streak, compareRoundsCompleted, checkAndUnlockBadges]
  );

  const handleCompareRoundComplete = useCallback(
    (outcome: RoundOutcome) => {
      const nextCompare = compareRoundsCompleted + 1;
      const nextFinds = moversFound + 1;
      const nextStreak = outcome.missedInRound ? 1 : streak + 1;
      const nextBest =
        bestTimeSec === null
          ? outcome.elapsedSeconds
          : Math.min(bestTimeSec, outcome.elapsedSeconds);

      setCompareRoundsCompleted(nextCompare);
      setMoversFound(nextFinds);
      setStreak(nextStreak);
      setBestTimeSec(nextBest);
      setLastOutcome(outcome);

      checkAndUnlockBadges({
        nextScore: score,
        nextStreak,
        nextCompareRounds: nextCompare,
        solveTimeSec: outcome.elapsedSeconds,
      });
    },
    [
      compareRoundsCompleted,
      moversFound,
      streak,
      bestTimeSec,
      score,
      checkAndUnlockBadges,
    ]
  );

  const handleMiss = useCallback(() => {
    setScore((prev) => Math.max(0, prev - 10));
    setStreak(0);
  }, []);

  const handleDeductPoints = useCallback((pts: number) => {
    setScore((prev) => Math.max(0, prev - pts));
  }, []);

  const handleNextSky = useCallback(() => {
    setRoundNumber((r) => r + 1);
    setLastOutcome(null);
  }, []);

  const handleQuizCorrect = useCallback(
    (questionType: QuizQuestionType) => {
      const nextScore = score + 50;
      setScore(nextScore);
      checkAndUnlockBadges({
        nextScore,
        nextStreak: streak,
        nextCompareRounds: compareRoundsCompleted,
        answeredBrightnessCorrectly: questionType === "brightness",
      });
    },
    [score, streak, compareRoundsCompleted, checkAndUnlockBadges]
  );

  const confirmResetProgress = () => {
    playSound("click");
    setScore(0);
    setMoversFound(0);
    setCompareRoundsCompleted(0);
    setStreak(0);
    setBestTimeSec(null);
    setUnlockedBadges(["cadet"]);
    setRoundNumber(1);
    setLastOutcome(null);
    setResetModalOpen(false);
    try {
      window.localStorage.removeItem(TRAINING_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  // Global keyboard shortcuts: Tab switches game tabs (when not in a modal), B = blink helper, H = hint, N = next sky
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (target?.closest('[role="dialog"]')) return;

      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Switch between "Spot the Mover" and "Compare the Skies" tabs
        e.preventDefault();
        handleSelectTab(activeTab === "spot" ? "compare" : "spot");
      } else if (e.key === "b" || e.key === "B") {
        if (activeTab === "compare") {
          e.preventDefault();
          setBlinkTriggerSeq((s) => s + 1);
        }
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        playSound("whoosh");
        handleNextSky();
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setHintTriggerSeq((s) => s + 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, handleSelectTab, playSound, handleNextSky]);

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-8 pb-16">
      {/* Top Header, Game Mode Glass Tabs & Collapsible "How to play" + "Reset progress" */}
      <section className="glass p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-mint/15 border border-pastel-mint/35 text-pastel-mint">
              <GraduationCap className="w-4 h-4" />
              <span>Training Mode</span>
            </span>
            <SampleDataBadge source="placeholder" />
          </div>

          {/* Game Tabs: "Spot the Mover" | "Compare the Skies" */}
          <div
            role="tablist"
            aria-label="Training game modes"
            className="inline-flex items-center p-1 rounded-full bg-white/[0.05] border border-white/15"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "spot"}
              onClick={() => handleSelectTab("spot")}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${
                activeTab === "spot"
                  ? "bg-pastel-mint/25 border border-pastel-mint/60 text-cosmic-text shadow-sm"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <Crosshair className="w-4 h-4 text-pastel-mint" />
              <span>Spot the Mover</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "compare"}
              onClick={() => handleSelectTab("compare")}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
                activeTab === "compare"
                  ? "bg-pastel-sky/25 border border-pastel-sky/60 text-cosmic-text shadow-sm"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <Columns2 className="w-4 h-4 text-pastel-sky" />
              <span>Compare the Skies</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setHowToPlayOpen((o) => !o);
              }}
              aria-expanded={howToPlayOpen}
              className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-cosmic-text inline-flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <span>How to play</span>
              {howToPlayOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                setResetModalOpen(true);
              }}
              aria-label="Reset training progress"
              className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-pastel-peach/20 border border-white/15 hover:border-pastel-peach/50 text-cosmic-muted hover:text-pastel-peach inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-peach"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset progress</span>
            </button>
          </div>
        </div>

        {/* Collapsible "How to play" Tips */}
        <AnimatePresence>
          {howToPlayOpen && (
            <motion.div
              initial={
                prefersReducedMotion ? { opacity: 1 } : { opacity: 0, height: 0 }
              }
              animate={{ opacity: 1, height: "auto" }}
              exit={
                prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
              }
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-cosmic-muted">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="font-heading font-semibold text-pastel-mint">
                    1. Spot the Mover
                  </div>
                  <p>
                    Photo A and Photo B flip every 650 ms. Tap the one dot that
                    jumps position to unlock its 3D cosmic reveal.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="font-heading font-semibold text-pastel-peach">
                    2. Compare the Skies
                  </div>
                  <p>
                    Inspect Visit 1 and Visit 2 side by side to find every star
                    that moved, brightened, appeared, or disappeared.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="font-heading font-semibold text-pastel-sky flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>3. Keyboard Shortcuts</span>
                  </div>
                  <p>
                    Press <code className="text-cosmic-text">Tab</code> to
                    switch games, <code className="text-cosmic-text">B</code> to
                    blink, <code className="text-cosmic-text">H</code> for a
                    hint, <code className="text-cosmic-text">N</code> for next
                    sky, and <code className="text-cosmic-text">1/2/3</code> for
                    quizzes.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* MAIN TWO-COLUMN LAYOUT (Desktop two columns, Mobile stacked) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Wide Column (7 cols): Active Game Card */}
        <div className="lg:col-span-7 w-full">
          {activeTab === "spot" ? (
            <SpotTheMover
              moversFound={moversFound}
              roundNumber={roundNumber}
              realSkyBundles={realSkyBundles}
              onHit={handleHit}
              onMiss={handleMiss}
              onUseHint={() => handleDeductPoints(30)}
              onNextSky={handleNextSky}
              hintTriggerSeq={hintTriggerSeq}
            />
          ) : (
            <CompareSkies
              compareRoundsCompleted={compareRoundsCompleted}
              roundNumber={roundNumber}
              onChangeFound={handleCompareChangeFound}
              onMiss={handleMiss}
              onDeductPoints={handleDeductPoints}
              onRoundComplete={handleCompareRoundComplete}
              onNextRound={handleNextSky}
              hintTriggerSeq={hintTriggerSeq}
              blinkTriggerSeq={blinkTriggerSeq}
            />
          )}
        </div>

        {/* Right Column (5 cols): Score Card + Quiz Card + Badges Card */}
        <aside className="lg:col-span-5 w-full space-y-6">
          {/* 2. SCORE CARD (Glass, 2-column grid) */}
          <div className="glass p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
                <div className="text-xs font-mono uppercase tracking-wider text-cosmic-muted">
                  Score
                </div>
                <div className="font-heading text-3xl sm:text-4xl font-bold text-[#FFD166] mt-1">
                  {animatedScore}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
                <div className="text-xs font-mono uppercase tracking-wider text-cosmic-muted">
                  Movers found
                </div>
                <div className="font-heading text-3xl sm:text-4xl font-bold text-[#B5EAD7] mt-1">
                  {animatedFinds}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <span className="text-cosmic-muted">Streak</span>
                <span className="font-mono font-bold text-pastel-lavender">
                  {streak} in a row
                </span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <span className="text-cosmic-muted">Best time</span>
                <span className="font-mono font-bold text-pastel-sky">
                  {bestTimeSec !== null ? `${bestTimeSec.toFixed(1)}s` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 3. "WHAT DID YOU SEE?" QUIZ CARD */}
          <QuizCard
            lastOutcome={lastOutcome}
            onAnswerCorrect={handleQuizCorrect}
            onNextSky={handleNextSky}
          />

          {/* 4. BADGES CARD */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-pastel-lavender">
                YOUR BADGES
              </span>
              <span className="text-xs font-mono text-cosmic-muted">
                {unlockedBadges.length} / {BADGE_DEFINITIONS.length} Unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {BADGE_DEFINITIONS.map((badge) => {
                const isUnlocked = unlockedBadges.includes(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-3.5 rounded-2xl border flex flex-col items-center text-center gap-2 transition-all ${
                      isUnlocked
                        ? "bg-white/[0.07] border-white/25 shadow-sm"
                        : "bg-white/[0.02] border-dashed border-white/20 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isUnlocked
                          ? `bg-gradient-to-br ${badge.gradient} shadow-md`
                          : "border-2 border-dashed border-white/30 bg-white/5"
                      }`}
                    >
                      <BadgeSvgIcon id={badge.id} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-heading text-xs font-bold text-cosmic-text">
                        {badge.name}
                      </div>
                      <div className="text-[10px] text-cosmic-muted leading-tight">
                        {badge.requirement}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      {/* Centre-Screen Badge Unlock Glass Modal */}
      <AnimatePresence>
        {newlyUnlockedBadge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0B0B1E]/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setNewlyUnlockedBadge(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="glass max-w-md w-full p-8 text-center space-y-5 border border-[#FFD166]/60 shadow-[0_0_50px_rgba(255,209,102,0.3)]"
            >
              <div
                className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br ${newlyUnlockedBadge.gradient} shadow-[0_0_32px_rgba(255,181,167,0.5)]`}
              >
                <BadgeSvgIcon id={newlyUnlockedBadge.id} />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-pastel-peach">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Achievement Unlocked</span>
                </div>
                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-gradient-headline">
                  New badge: {newlyUnlockedBadge.name}
                </h3>
                <p className="text-sm text-cosmic-muted">
                  {newlyUnlockedBadge.requirement}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setNewlyUnlockedBadge(null);
                }}
                className="min-h-[44px] px-8 py-3 rounded-full font-heading font-semibold text-xs uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
              >
                Continue Investigating
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Glass Confirm Modal for "Reset progress" */}
      <AnimatePresence>
        {resetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0B0B1E]/75 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setResetModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-dialog-title"
              className="glass max-w-md w-full p-7 space-y-5 border border-white/25 shadow-glass-glow"
            >
              <div className="space-y-2">
                <h3
                  id="reset-dialog-title"
                  className="font-heading text-xl font-bold text-cosmic-text"
                >
                  Reset Training Progress?
                </h3>
                <p className="text-sm text-cosmic-muted leading-relaxed">
                  This will clear your current score ({score} pts), movers found
                  ({moversFound}), streak, and unlocked badges back to Cadet
                  level.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setResetModalOpen(false);
                  }}
                  className="min-h-[44px] px-5 py-2.5 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-cosmic-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetProgress}
                  className="min-h-[44px] px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-pastel-peach text-[#0B0B1E]"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
