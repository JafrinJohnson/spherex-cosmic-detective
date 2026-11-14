"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Keyboard,
  Crosshair,
  Columns2,
  Compass,
  HelpCircle,
  Gamepad2,
  Rocket,
  Sparkles,
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
import { MissionsTab } from "@/components/training/MissionsTab";
import { SkyQuizTab } from "@/components/training/SkyQuizTab";
import { PageTransition } from "@/components/PageTransition";
import { useSound } from "@/components/SoundProvider";
import { useAuth } from "@/context/AuthProvider";
import { getTrainingStorageKey } from "@/lib/auth";
import { ClassroomCard } from "@/components/auth/ClassroomCard";

const LEGACY_TRAINING_STORAGE_KEY = "cosmic-detective-training-progress-v1";
const TRAINING_MODE_STORAGE_KEY = "cosmic-detective-training-mode-v2";
const TRAINING_FREE_TAB_STORAGE_KEY = "cosmic-detective-training-tab-v1";

export type TrainingTopTab = "missions" | "quiz" | "freeplay";
export type FreePlayGameTab = "spot" | "compare";

export type BadgeId =
  | "cadet"
  | "observer"
  | "planet-hunter"
  | "sharp-eye"
  | "quick-draw"
  | "variable-spotter"
  | "change-finder"
  | "voyager";

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
  {
    id: "voyager",
    name: "Cosmic Voyager",
    requirement: "Discover 14 solar bodies in Voyage",
    gradient: "from-[#FFD166] to-[#B5EAD7]",
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
    case "voyager":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6.05 11a22.35 22.35 0 0 1-3.95 2z"
            stroke="#0B0B1E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
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
  missionStars?: Record<number, 1 | 2 | 3>;
  bestSkyQuizScore?: number;
}

export default function TrainingPage() {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();
  const { user, hydrated: authHydrated } = useAuth();
  const storageKey = getTrainingStorageKey(user);

  // Top Tabs: "Missions" | "Sky Quiz" | "Free Play" (persisted in localStorage)
  const [topTab, setTopTab] = useState<TrainingTopTab>("missions");

  // Free play sub-tab: "Spot the Mover" | "Compare the Skies"
  const [freeGameTab, setFreeGameTab] = useState<FreePlayGameTab>("spot");

  // Persisted progress states
  const [score, setScore] = useState<number>(0);
  const [moversFound, setMoversFound] = useState<number>(0);
  const [compareRoundsCompleted, setCompareRoundsCompleted] =
    useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestTimeSec, setBestTimeSec] = useState<number | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeId[]>(["cadet"]);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [missionStars, setMissionStars] = useState<Record<number, 1 | 2 | 3>>({});
  const [bestSkyQuizScore, setBestSkyQuizScore] = useState<number>(0);
  const [hydrated, setHydrated] = useState<boolean>(false);

  // Free play round quiz & modal states
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

  // Load saved progress for current user key & active tabs from localStorage
  useEffect(() => {
    if (!authHydrated) return;
    setHydrated(false);
    try {
      const savedTopTab = window.localStorage.getItem(TRAINING_MODE_STORAGE_KEY);
      if (
        savedTopTab === "missions" ||
        savedTopTab === "quiz" ||
        savedTopTab === "freeplay"
      ) {
        setTopTab(savedTopTab);
      }

      const savedFreeTab = window.localStorage.getItem(
        TRAINING_FREE_TAB_STORAGE_KEY
      );
      if (savedFreeTab === "spot" || savedFreeTab === "compare") {
        setFreeGameTab(savedFreeTab);
      }

      let raw = window.localStorage.getItem(storageKey);
      if (!raw && storageKey === "progress:guest") {
        raw = window.localStorage.getItem(LEGACY_TRAINING_STORAGE_KEY);
        if (raw) {
          window.localStorage.setItem("progress:guest", raw);
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw) as StoredTrainingProgress;
        setScore(typeof parsed.score === "number" ? parsed.score : 0);
        setMoversFound(
          typeof parsed.moversFound === "number" ? parsed.moversFound : 0
        );
        setCompareRoundsCompleted(
          typeof parsed.compareRoundsCompleted === "number"
            ? parsed.compareRoundsCompleted
            : 0
        );
        setStreak(typeof parsed.streak === "number" ? parsed.streak : 0);
        setBestTimeSec(
          parsed.bestTimeSec === null || typeof parsed.bestTimeSec === "number"
            ? parsed.bestTimeSec
            : null
        );
        setUnlockedBadges(
          Array.isArray(parsed.unlockedBadges) &&
            parsed.unlockedBadges.length > 0
            ? parsed.unlockedBadges
            : ["cadet"]
        );
        setRoundNumber(
          typeof parsed.roundNumber === "number" && parsed.roundNumber >= 1
            ? parsed.roundNumber
            : 1
        );
        setMissionStars(
          parsed.missionStars && typeof parsed.missionStars === "object"
            ? parsed.missionStars
            : {}
        );
        setBestSkyQuizScore(
          typeof parsed.bestSkyQuizScore === "number"
            ? parsed.bestSkyQuizScore
            : 0
        );
      } else {
        setScore(0);
        setMoversFound(0);
        setCompareRoundsCompleted(0);
        setStreak(0);
        setBestTimeSec(null);
        setUnlockedBadges(["cadet"]);
        setRoundNumber(1);
        setMissionStars({});
        setBestSkyQuizScore(0);
      }
    } catch {
      // Ignore storage access errors
    }
    setHydrated(true);
  }, [authHydrated, storageKey]);

  // Load real sky frames once on mount
  useEffect(() => {
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
    if (!hydrated || !authHydrated) return;
    try {
      const payload: StoredTrainingProgress = {
        score,
        moversFound,
        compareRoundsCompleted,
        streak,
        bestTimeSec,
        unlockedBadges,
        roundNumber,
        missionStars,
        bestSkyQuizScore,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage errors
    }
  }, [
    hydrated,
    authHydrated,
    storageKey,
    score,
    moversFound,
    compareRoundsCompleted,
    streak,
    bestTimeSec,
    unlockedBadges,
    roundNumber,
    missionStars,
    bestSkyQuizScore,
  ]);

  const handleSelectTopTab = useCallback(
    (tab: TrainingTopTab) => {
      playSound("click");
      setTopTab(tab);
      try {
        window.localStorage.setItem(TRAINING_MODE_STORAGE_KEY, tab);
      } catch {
        // Ignore
      }
    },
    [playSound]
  );

  const handleSelectFreeGameTab = useCallback(
    (tab: FreePlayGameTab) => {
      playSound("click");
      setFreeGameTab(tab);
      try {
        window.localStorage.setItem(TRAINING_FREE_TAB_STORAGE_KEY, tab);
      } catch {
        // Ignore
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
          playSound("levelup");
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

  const handleAddPoints = useCallback(
    (pts: number) => {
      setScore((prev) => {
        const nextScore = prev + pts;
        checkAndUnlockBadges({
          nextScore,
          nextStreak: streak,
          nextCompareRounds: compareRoundsCompleted,
        });
        return nextScore;
      });
    },
    [streak, compareRoundsCompleted, checkAndUnlockBadges]
  );

  const handleSaveMissionStars = useCallback(
    (missionId: number, stars: 1 | 2 | 3) => {
      setMissionStars((prev) => ({
        ...prev,
        [missionId]: stars,
      }));
    },
    []
  );

  const handleUpdateBestSkyQuizScore = useCallback((newBest: number) => {
    setBestSkyQuizScore(newBest);
  }, []);

  // Free play hit handlers
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
    playSound("wrong");
    setScore((prev) => Math.max(0, prev - 10));
    setStreak(0);
  }, [playSound]);

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
    setMissionStars({});
    setBestSkyQuizScore(0);
    setLastOutcome(null);
    setResetModalOpen(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut for free play mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (target?.closest('[role="dialog"]')) return;

      if (topTab === "freeplay") {
        if (e.key === "b" || e.key === "B") {
          if (freeGameTab === "compare") {
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [topTab, freeGameTab, playSound, handleNextSky]);

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-8 pb-16">
      {/* Top Header & 3 Main Tabs: Missions | Sky Quiz | Free Play */}
      <section className="glass p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
              Training
            </h1>
            <p className="text-base text-cosmic-muted mt-1">
              Master the science of spotting asteroids, comets, and moving worlds.
            </p>
          </div>

          {/* MAIN TABS: Missions | Sky Quiz | Free Play */}
          <div
            role="tablist"
            aria-label="Training modes"
            className="inline-flex items-center p-1.5 rounded-full bg-white/[0.05] border border-white/15"
          >
            <button
              type="button"
              role="tab"
              aria-selected={topTab === "missions"}
              onClick={() => handleSelectTopTab("missions")}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${
                topTab === "missions"
                  ? "bg-pastel-mint/25 border border-pastel-mint/60 text-cosmic-text shadow-sm"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <Compass className="w-4 h-4 text-pastel-mint" />
              <span>Missions</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={topTab === "quiz"}
              onClick={() => handleSelectTopTab("quiz")}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
                topTab === "quiz"
                  ? "bg-pastel-peach/25 border border-pastel-peach/60 text-cosmic-text shadow-sm"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <HelpCircle className="w-4 h-4 text-pastel-peach" />
              <span>Sky Quiz</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={topTab === "freeplay"}
              onClick={() => handleSelectTopTab("freeplay")}
              className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
                topTab === "freeplay"
                  ? "bg-pastel-sky/25 border border-pastel-sky/60 text-cosmic-text shadow-sm"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <Gamepad2 className="w-4 h-4 text-pastel-sky" />
              <span>Free Play</span>
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
                    1. Mission Academy
                  </div>
                  <p>
                    Follow the 6 mission nodes in sequence. Learn the astronomical
                    principles, find the candidate, and ace the 3-question quiz.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="font-heading font-semibold text-pastel-peach">
                    2. 20-Second Sky Quiz
                  </div>
                  <p>
                    Test your celestial knowledge under pressure with 10 random
                    questions from our 30+ question astronomical archive.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="font-heading font-semibold text-pastel-sky flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>3. Controls & Keys</span>
                  </div>
                  <p>
                    Press <code className="text-cosmic-text">1/2/3/4</code> to
                    select quiz answers and <code className="text-cosmic-text">Enter</code> to advance.
                    In Free Play, use <code className="text-cosmic-text">B</code> to blink and <code className="text-cosmic-text">H</code> for a hint.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Role-Based Experience Banner: Student Daily Goal OR Educator Classroom Card */}
      {user?.role === "student" && (
        <section
          aria-label="Student daily goal"
          className="glass rounded-3xl border border-[#B5EAD7]/40 bg-gradient-to-r from-[#B5EAD7]/[0.1] via-white/[0.04] to-[#A2D2FF]/[0.08] p-5 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-heading text-base sm:text-lg font-bold text-[#EDEBFF]">
                Your goal today: find 3 movers
              </p>
              <p className="text-xs text-[#CFCBEA]">
                {moversFound >= 3
                  ? "Goal complete! Keep spotting movers to climb the leaderboard."
                  : `${Math.min(3, moversFound)} of 3 movers spotted so far.`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B5EAD7]/45 bg-[#B5EAD7]/15 px-3.5 py-1 text-xs font-mono font-bold text-[#B5EAD7]">
              {Math.min(3, moversFound)} / 3
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B5EAD7] to-[#A2D2FF] transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((Math.min(3, moversFound) / 3) * 100))}%`,
              }}
            />
          </div>
        </section>
      )}

      {user?.role === "educator" && <ClassroomCard />}

      {/* Cosmic Voyage 3D Simulation Banner */}
      <section
        aria-label="Cosmic Voyage 3D Game"
        className="glass rounded-3xl border border-[#FFD166]/40 bg-gradient-to-r from-[#FFD166]/15 via-white/[0.04] to-[#A2D2FF]/15 p-5 sm:p-6 shadow-xl relative overflow-hidden"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FFD166]/20 border border-[#FFD166]/40 text-xs font-bold text-[#FFD166] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive 3D Game</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-[#EDEBFF]">
              Cosmic Voyage: Solar System Recon
            </h2>
            <p className="text-xs sm:text-sm text-cosmic-muted leading-relaxed">
              Pilot the SPHEREx Recon Scout across the Solar System! Fly in 3D past 14 celestial bodies, scan their infrared spectra, test your astronomical knowledge, and earn the Cosmic Voyager badge.
            </p>
          </div>

          <Link
            href="/voyage"
            onClick={() => playSound("click")}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-pastel-mint via-pastel-sky to-pastel-peach text-cosmic-bg text-sm font-bold shadow-lg hover:shadow-pastel-mint/30 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2.5 shrink-0"
          >
            <Rocket className="w-4 h-4" />
            <span>Launch Voyage</span>
          </Link>
        </div>
      </section>

      {/* TAB 1: MISSIONS */}
      {topTab === "missions" && (
        <MissionsTab
          missionStars={missionStars}
          onSaveMissionStars={handleSaveMissionStars}
          onAddPoints={handleAddPoints}
          realSkyBundles={realSkyBundles}
        />
      )}

      {/* TAB 2: SKY QUIZ */}
      {topTab === "quiz" && (
        <SkyQuizTab
          bestScore={bestSkyQuizScore}
          onAddPoints={handleAddPoints}
          onUpdateBestScore={handleUpdateBestSkyQuizScore}
        />
      )}

      {/* TAB 3: FREE PLAY */}
      {topTab === "freeplay" && (
        <div className="space-y-8">
          {/* Sub-toggle: Spot the Mover | Compare the Skies */}
          <div className="flex items-center justify-center">
            <div
              role="tablist"
              aria-label="Free play game modes"
              className="inline-flex items-center p-1 rounded-full bg-white/[0.05] border border-white/15"
            >
              <button
                type="button"
                role="tab"
                aria-selected={freeGameTab === "spot"}
                onClick={() => handleSelectFreeGameTab("spot")}
                className={`min-h-[44px] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${
                  freeGameTab === "spot"
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
                aria-selected={freeGameTab === "compare"}
                onClick={() => handleSelectFreeGameTab("compare")}
                className={`min-h-[44px] px-5 py-2 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
                  freeGameTab === "compare"
                    ? "bg-pastel-sky/25 border border-pastel-sky/60 text-cosmic-text shadow-sm"
                    : "text-cosmic-muted hover:text-cosmic-text"
                }`}
              >
                <Columns2 className="w-4 h-4 text-pastel-sky" />
                <span>Compare the Skies</span>
              </button>
            </div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Wide Column: Game */}
            <div className="lg:col-span-7 w-full">
              {freeGameTab === "spot" ? (
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

            {/* Right Column: Score + Quiz Card + Badges */}
            <aside className="lg:col-span-5 w-full space-y-6">
              {/* SCORE CARD */}
              <div className="glass p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
                    <div className="text-xs text-cosmic-muted">Score</div>
                    <div className="font-mono text-3xl sm:text-4xl font-medium text-[#FFD166] mt-1">
                      {animatedScore}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
                    <div className="text-xs text-cosmic-muted">Movers found</div>
                    <div className="font-mono text-3xl sm:text-4xl font-medium text-[#B5EAD7] mt-1">
                      {animatedFinds}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-cosmic-muted">Streak</span>
                    <span className="font-mono font-medium text-pastel-lavender">
                      {streak} in a row
                    </span>
                  </div>

                  <div className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <span className="text-cosmic-muted">Best time</span>
                    <span className="font-mono font-medium text-pastel-sky">
                      {bestTimeSec !== null ? `${bestTimeSec.toFixed(1)}s` : "None"}
                    </span>
                  </div>
                </div>
              </div>

              {/* QUIZ CARD */}
              <QuizCard
                lastOutcome={lastOutcome}
                onAnswerCorrect={handleQuizCorrect}
                onNextSky={handleNextSky}
              />

              {/* BADGES CARD */}
              <div className="glass p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-lg font-medium text-cosmic-text">
                    Your badges
                  </h2>
                  <span className="text-xs font-mono text-cosmic-muted">
                    {unlockedBadges.length} / {BADGE_DEFINITIONS.length} unlocked
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
        </div>
      )}

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
                <h3 className="font-heading text-2xl sm:text-3xl font-medium text-cosmic-text">
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
                className="min-h-[44px] px-8 py-3 rounded-full font-heading font-medium text-sm bg-infrared-gradient text-[#07090F] shadow-infrared-glow"
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
                  ({moversFound}), mission stars, sky quiz records, and unlocked badges back to Cadet
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
