"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import {
  Eye,
  Lightbulb,
  RotateCcw,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useSound } from "@/components/SoundProvider";
import {
  FoundReveal,
  type RevealObjectType,
} from "@/components/training/FoundReveal";
import type { RoundOutcome } from "@/components/training/SpotTheMover";

export type SkyChangeKind = "MOVED" | "BRIGHTER" | "NEW" | "GONE";

interface SkyChangeItem {
  id: number;
  kind: SkyChangeKind;
  label: "Moved" | "Brighter" | "New" | "Gone";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  radius: number;
  color: string;
}

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

interface CompareSkiesProps {
  compareRoundsCompleted: number;
  roundNumber: number;
  onChangeFound: (points: number) => void;
  onMiss: () => void;
  onDeductPoints: (points: number) => void;
  onRoundComplete: (outcome: RoundOutcome) => void;
  onNextRound: () => void;
  hintTriggerSeq: number;
  blinkTriggerSeq: number;
  forcedLevel?: 1 | 2 | 3 | 4;
  suppressInternalReveal?: boolean;
}

const CANVAS_W = 360;
const CANVAS_H = 360;

function createSeededRng(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "#FFB5A7" : "none"}
      stroke={filled ? "#FFB5A7" : "rgba(237, 235, 255, 0.35)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="transition-transform duration-200"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function CompareSkies({
  compareRoundsCompleted,
  roundNumber,
  onChangeFound,
  onMiss,
  onDeductPoints,
  onRoundComplete,
  onNextRound,
  hintTriggerSeq,
  blinkTriggerSeq,
  forcedLevel,
  suppressInternalReveal = false,
}: CompareSkiesProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null);
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null);

  // Level up every 2 completed rounds (L1..L4) unless forcedLevel is set
  const level: 1 | 2 | 3 | 4 = useMemo(() => {
    if (forcedLevel) return forcedLevel;
    if (compareRoundsCompleted >= 6) return 4;
    if (compareRoundsCompleted >= 4) return 3;
    if (compareRoundsCompleted >= 2) return 2;
    return 1;
  }, [forcedLevel, compareRoundsCompleted]);

  const levelConfig = useMemo(() => {
    switch (level) {
      case 1:
        return { changesCount: 1, starsCount: 25, hasTimer: false };
      case 2:
        return { changesCount: 2, starsCount: 40, hasTimer: false };
      case 3:
        return { changesCount: 3, starsCount: 55, hasTimer: false };
      case 4:
        return { changesCount: 3, starsCount: 55, hasTimer: true };
    }
  }, [level]);

  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [foundIds, setFoundIds] = useState<number[]>([]);
  const [lives, setLives] = useState<number>(3);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(60);
  const [revealOpen, setRevealOpen] = useState<boolean>(false);
  const [blinkOverlayActive, setBlinkOverlayActive] = useState<boolean>(false);
  const [blinkShowVisit2, setBlinkShowVisit2] = useState<boolean>(false);
  const [hintTargetId, setHintTargetId] = useState<number | null>(null);

  const roundStartRef = useRef<number>(performance.now());
  const hintStartedAtRef = useRef<number | null>(null);
  const ripplesRef = useRef<
    Array<{ canvasIdx: 1 | 2; x: number; y: number; startedAt: number }>
  >([]);

  // Generate seeded background stars and N distinct changes
  const roundData = useMemo(() => {
    const rng = createSeededRng(
      roundNumber * 6151 + level * 313 + retryCounter * 997
    );
    const palette = ["#EDEBFF", "#C3B1E1", "#A2D2FF", "#FFB5A7", "#B5EAD7"];

    const stars: BackgroundStar[] = [];
    for (let i = 0; i < levelConfig.starsCount; i++) {
      stars.push({
        x: 28 + rng() * (CANVAS_W - 56),
        y: 28 + rng() * (CANVAS_H - 56),
        radius: 1.2 + Math.pow(rng(), 2.1) * 2.3,
        color: palette[Math.floor(rng() * palette.length)],
        alpha: 0.45 + rng() * 0.48,
      });
    }

    const allKinds: Array<{
      kind: SkyChangeKind;
      label: SkyChangeItem["label"];
    }> = [
      { kind: "MOVED", label: "Moved" },
      { kind: "BRIGHTER", label: "Brighter" },
      { kind: "NEW", label: "New" },
      { kind: "GONE", label: "Gone" },
    ];

    // Pick N distinct change types so the player experiences varied changes
    const pool = [...allKinds];
    const changes: SkyChangeItem[] = [];

    for (let i = 0; i < levelConfig.changesCount; i++) {
      const pickIdx = Math.floor(rng() * pool.length);
      const chosen = pool.splice(pickIdx, 1)[0] || allKinds[i % allKinds.length];

      // Keep changes well-spaced from edges and from each other
      let x1 = 56 + rng() * (CANVAS_W - 112);
      let y1 = 56 + rng() * (CANVAS_H - 112);
      for (let attempt = 0; attempt < 15; attempt++) {
        const tooClose = changes.some(
          (c) => Math.hypot(c.x1 - x1, c.y1 - y1) < 72
        );
        if (!tooClose) break;
        x1 = 56 + rng() * (CANVAS_W - 112);
        y1 = 56 + rng() * (CANVAS_H - 112);
      }

      const angle = rng() * Math.PI * 2;
      const shiftDist = 10 + rng() * 9; // 10–19 px (within 8–20 px spec)
      const x2 =
        chosen.kind === "MOVED"
          ? Math.max(36, Math.min(CANVAS_W - 36, x1 + Math.cos(angle) * shiftDist))
          : x1;
      const y2 =
        chosen.kind === "MOVED"
          ? Math.max(36, Math.min(CANVAS_H - 36, y1 + Math.sin(angle) * shiftDist))
          : y1;

      changes.push({
        id: i + 1,
        kind: chosen.kind,
        label: chosen.label,
        x1,
        y1,
        x2,
        y2,
        radius: 2.9,
        color:
          chosen.kind === "BRIGHTER"
            ? "#FFC8DD"
            : chosen.kind === "NEW"
            ? "#A2D2FF"
            : "#FFD166",
      });
    }

    // Choose RevealObjectType matching the most interesting change:
    // MOVED/NEW -> asteroid or comet; BRIGHTER -> variable-star
    let revealType: RevealObjectType = "asteroid";
    const hasMovedOrNew = changes.some(
      (c) => c.kind === "MOVED" || c.kind === "NEW"
    );
    const hasBrighter = changes.some((c) => c.kind === "BRIGHTER");
    if (hasMovedOrNew) {
      revealType = rng() < 0.55 ? "asteroid" : "comet";
    } else if (hasBrighter) {
      revealType = "variable-star";
    }

    return {
      stars,
      changes,
      revealType,
    };
  }, [roundNumber, level, levelConfig.starsCount, levelConfig.changesCount, retryCounter]);

  const isOutOfLives =
    lives <= 0 || (levelConfig.hasTimer && timeLeftSec <= 0);
  const isRoundComplete =
    foundIds.length === roundData.changes.length &&
    roundData.changes.length > 0;

  // Reset state on new round or retry
  useEffect(() => {
    setFoundIds([]);
    setLives(3);
    setTimeLeftSec(60);
    setRevealOpen(false);
    setBlinkOverlayActive(false);
    setHintTargetId(null);
    roundStartRef.current = performance.now();
    hintStartedAtRef.current = null;
    ripplesRef.current = [];
  }, [roundNumber, retryCounter]);

  // 60-second countdown timer on Level 4
  useEffect(() => {
    if (!levelConfig.hasTimer || isRoundComplete || isOutOfLives) return;
    const id = window.setInterval(() => {
      setTimeLeftSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [levelConfig.hasTimer, isRoundComplete, isOutOfLives]);

  // Helper 1: "Blink them" (overlays Visit 2 on Visit 1 and blinks for 3 seconds, costs 40 points)
  const triggerBlinkHelper = useCallback(() => {
    if (isRoundComplete || isOutOfLives || blinkOverlayActive) return;
    playSound("click");
    onDeductPoints(40);
    setBlinkOverlayActive(true);
    setBlinkShowVisit2(true);
  }, [isRoundComplete, isOutOfLives, blinkOverlayActive, playSound, onDeductPoints]);

  useEffect(() => {
    if (!blinkOverlayActive) return;
    const intervalMs = prefersReducedMotion ? 750 : 420;
    const flipTimer = window.setInterval(() => {
      setBlinkShowVisit2((prev) => !prev);
    }, intervalMs);
    const stopTimer = window.setTimeout(() => {
      setBlinkOverlayActive(false);
      setBlinkShowVisit2(false);
    }, 3000);

    return () => {
      window.clearInterval(flipTimer);
      window.clearTimeout(stopTimer);
    };
  }, [blinkOverlayActive, prefersReducedMotion]);

  // Helper 2: "Hint" (circles one unfound change area, costs 30 points)
  const triggerHintHelper = useCallback(() => {
    if (isRoundComplete || isOutOfLives) return;
    const unfound = roundData.changes.find((c) => !foundIds.includes(c.id));
    if (!unfound) return;
    playSound("click");
    onDeductPoints(30);
    setHintTargetId(unfound.id);
    hintStartedAtRef.current = performance.now();
  }, [
    isRoundComplete,
    isOutOfLives,
    roundData.changes,
    foundIds,
    playSound,
    onDeductPoints,
  ]);

  // Listen to parent keyboard shortcuts ('H' and 'B')
  useEffect(() => {
    if (hintTriggerSeq > 0) {
      triggerHintHelper();
    }
  }, [hintTriggerSeq, triggerHintHelper]);

  useEffect(() => {
    if (blinkTriggerSeq > 0) {
      triggerBlinkHelper();
    }
  }, [blinkTriggerSeq, triggerBlinkHelper]);

  // Render both Visit 1 and Visit 2 canvases
  useEffect(() => {
    let rafId = 0;

    const drawVisitCanvas = (
      ctx: CanvasRenderingContext2D,
      visitNumber: 1 | 2,
      canvasIndex: 1 | 2,
      now: number
    ) => {
      ctx.fillStyle = "#07061A";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Faint telescope pixel grid
      ctx.strokeStyle = "rgba(195, 177, 225, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_W; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Static background stars
      for (const star of roundData.stars) {
        const grad = ctx.createRadialGradient(
          star.x,
          star.y,
          0,
          star.x,
          star.y,
          star.radius * 3.1
        );
        grad.addColorStop(0, star.color);
        grad.addColorStop(0.45, `${star.color}66`);
        grad.addColorStop(1, "rgba(7, 6, 26, 0)");

        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 3.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw each change item according to visitNumber (1 or 2)
      for (const ch of roundData.changes) {
        let shouldDraw = true;
        const x = visitNumber === 1 ? ch.x1 : ch.x2;
        const y = visitNumber === 1 ? ch.y1 : ch.y2;
        let r = ch.radius;

        if (ch.kind === "NEW" && visitNumber === 1) {
          shouldDraw = false;
        } else if (ch.kind === "GONE" && visitNumber === 2) {
          shouldDraw = false;
        } else if (ch.kind === "BRIGHTER") {
          r = visitNumber === 1 ? ch.radius * 0.62 : ch.radius * 1.65;
        }

        if (shouldDraw) {
          const glowRadius = r * (ch.kind === "BRIGHTER" && visitNumber === 2 ? 4.2 : 3.4);
          const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
          grad.addColorStop(0, ch.color);
          grad.addColorStop(0.45, "rgba(255, 209, 102, 0.5)");
          grad.addColorStop(1, "rgba(7, 6, 26, 0)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // If found, draw mint ring + small label ("Moved", "Brighter", "New", "Gone") on BOTH images
        const isFound = foundIds.includes(ch.id);
        if (isFound) {
          const ringX = canvasIndex === 1 ? ch.x1 : ch.x2;
          const ringY = canvasIndex === 1 ? ch.y1 : ch.y2;

          ctx.save();
          ctx.strokeStyle = "#B5EAD7";
          ctx.lineWidth = 2.2;
          ctx.shadowColor = "#B5EAD7";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(ringX, ringY, 17, 0, Math.PI * 2);
          ctx.stroke();

          // Label pill above ring
          ctx.shadowBlur = 0;
          ctx.font = "600 10px monospace";
          const textW = ctx.measureText(ch.label).width + 10;
          const pillX = Math.max(
            4,
            Math.min(CANVAS_W - textW - 4, ringX - textW / 2)
          );
          const pillY = ringY > 34 ? ringY - 29 : ringY + 20;

          ctx.fillStyle = "rgba(11, 11, 30, 0.9)";
          ctx.strokeStyle = "rgba(181, 234, 215, 0.7)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, textW, 16, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#B5EAD7";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(ch.label, pillX + textW / 2, pillY + 8.5);
          ctx.restore();
        } else if (isOutOfLives) {
          // When out of lives, circle the missed changes in peach/gold so the user sees what they missed
          const missX = canvasIndex === 1 ? ch.x1 : ch.x2;
          const missY = canvasIndex === 1 ? ch.y1 : ch.y2;

          ctx.save();
          ctx.strokeStyle = "#FFB5A7";
          ctx.lineWidth = 2.2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(missX, missY, 19, 0, Math.PI * 2);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.font = "600 10px monospace";
          const labelText = `Missed: ${ch.label}`;
          const textW = ctx.measureText(labelText).width + 10;
          const pillX = Math.max(
            4,
            Math.min(CANVAS_W - textW - 4, missX - textW / 2)
          );
          const pillY = missY > 34 ? missY - 29 : missY + 20;

          ctx.fillStyle = "rgba(11, 11, 30, 0.92)";
          ctx.strokeStyle = "rgba(255, 181, 167, 0.8)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, textW, 16, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#FFB5A7";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(labelText, pillX + textW / 2, pillY + 8.5);
          ctx.restore();
        }
      }

      // Draw Hint dashed circle if active on an unfound change
      if (hintStartedAtRef.current !== null && hintTargetId !== null) {
        const age = (now - hintStartedAtRef.current) / 1000;
        if (age <= 3.0) {
          const target = roundData.changes.find((c) => c.id === hintTargetId);
          if (target) {
            const hx = canvasIndex === 1 ? target.x1 : target.x2;
            const hy = canvasIndex === 1 ? target.y1 : target.y2;
            const alpha = Math.sin((age / 3.0) * Math.PI) * 0.9;
            ctx.save();
            ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
            ctx.lineWidth = 2.2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.arc(hx, hy, 38, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          hintStartedAtRef.current = null;
          setHintTargetId(null);
        }
      }

      // Draw wrong-tap peach ripples on this canvas
      for (const r of ripplesRef.current) {
        if (r.canvasIdx !== canvasIndex) continue;
        const p = (now - r.startedAt) / 650;
        if (p >= 1) continue;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 181, 167, ${(1 - p) * 0.85})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 6 + p * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    };

    const renderLoop = (now: number) => {
      ripplesRef.current = ripplesRef.current.filter(
        (r) => now - r.startedAt < 650
      );

      const c1 = canvas1Ref.current;
      const c2 = canvas2Ref.current;
      if (c1) {
        const ctx1 = c1.getContext("2d");
        if (ctx1) {
          // When "Blink them" helper is active, Visit 1 canvas alternates between Visit 1 and Visit 2
          const visitToDrawOn1: 1 | 2 =
            blinkOverlayActive && blinkShowVisit2 ? 2 : 1;
          drawVisitCanvas(ctx1, visitToDrawOn1, 1, now);
        }
      }
      if (c2) {
        const ctx2 = c2.getContext("2d");
        if (ctx2) {
          drawVisitCanvas(ctx2, 2, 2, now);
        }
      }

      rafId = window.requestAnimationFrame(renderLoop);
    };

    rafId = window.requestAnimationFrame(renderLoop);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    roundData,
    foundIds,
    isOutOfLives,
    blinkOverlayActive,
    blinkShowVisit2,
    hintTargetId,
  ]);

  const handleCanvasTap = (
    canvasIndex: 1 | 2,
    e: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (isRoundComplete || isOutOfLives) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const clickY = ((e.clientY - rect.top) / rect.height) * CANVAS_H;

    // Check if within 18 px of any unfound change (either Visit 1 or Visit 2 position)
    const matched = roundData.changes.find((ch) => {
      if (foundIds.includes(ch.id)) return false;
      const d1 = Math.hypot(clickX - ch.x1, clickY - ch.y1);
      const d2 = Math.hypot(clickX - ch.x2, clickY - ch.y2);
      return d1 <= 18 || d2 <= 18;
    });

    if (matched) {
      const nextFound = [...foundIds, matched.id];
      setFoundIds(nextFound);
      onChangeFound(60);

      // Check if ALL changes in this round are now found
      if (nextFound.length === roundData.changes.length) {
        playSound("success");
        if (!suppressInternalReveal) {
          setRevealOpen(true);
        }

        const elapsedSec = Number(
          ((performance.now() - roundStartRef.current) / 1000).toFixed(2)
        );
        const firstFoundId = nextFound[0];
        const firstChange =
          roundData.changes.find((c) => c.id === firstFoundId) || matched;

        // Build tailored quiz question for QuizCard
        const allLabels: Array<SkyChangeItem["label"]> = [
          "Moved",
          "Brighter",
          "New",
          "Gone",
        ];
        const distractors = allLabels.filter((l) => l !== firstChange.label);
        const options: [string, string, string] = [
          firstChange.label,
          distractors[0],
          distractors[1],
        ];

        let snapshotDataUrl: string | undefined;
        try {
          snapshotDataUrl = canvas2Ref.current?.toDataURL("image/png");
        } catch {
          snapshotDataUrl = undefined;
        }

        onRoundComplete({
          roundId: roundNumber * 100 + retryCounter,
          level,
          dx: firstChange.x2 - firstChange.x1,
          dy: firstChange.y2 - firstChange.y1,
          directionWords: firstChange.label,
          oppositeDirectionWords: distractors[0],
          hasDecoy: roundData.changes.some((c) => c.kind === "BRIGHTER"),
          photosCompared: 2,
          elapsedSeconds: elapsedSec,
          missedInRound: lives < 3,
          pointsEarned: roundData.changes.length * 60,
          objectType: roundData.revealType,
          snapshotDataUrl,
          compareQuiz: {
            prompt:
              roundData.changes.length > 1
                ? "Which change did you find first in this pair of skies?"
                : "What kind of change did you spot between Visit 1 and Visit 2?",
            options,
            correctIndex: 0,
            explanation: `The ${firstChange.label.toLowerCase()} object was spotted by comparing Visit 1 and Visit 2 side by side.`,
            questionType:
              firstChange.kind === "BRIGHTER" ? "brightness" : "direction",
          },
        });
      } else {
        playSound("click");
      }
    } else {
      // Wrong tap: peach ripple, lose a life, -10 points
      playSound("click");
      ripplesRef.current.push({
        canvasIdx: canvasIndex,
        x: clickX,
        y: clickY,
        startedAt: performance.now(),
      });
      setLives((prev) => Math.max(0, prev - 1));
      onMiss();
    }
  };

  // Circular countdown SVG progress for Level 4
  const timerCircumference = 2 * Math.PI * 15;
  const timerDashOffset =
    timerCircumference * (1 - Math.max(0, Math.min(1, timeLeftSec / 60)));

  return (
    <div className="glass p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-pastel-lavender/20 border border-pastel-lavender/45 text-pastel-lavender">
              Level {level}
            </span>

            {/* Progress Chip */}
            <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-pastel-mint/20 border border-pastel-mint/45 text-pastel-mint">
              Changes found: <span className="font-mono">{foundIds.length} / {roundData.changes.length}</span>
            </span>

            {/* 3 Heart Lives (Inline SVG) */}
            <div
              role="group"
              aria-label={`Lives remaining: ${lives} of 3`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15"
            >
              {[1, 2, 3].map((heartIdx) => (
                <HeartIcon key={heartIdx} filled={heartIdx <= lives} />
              ))}
            </div>

            {/* Level 4 60-Second Circular Countdown Timer */}
            {levelConfig.hasTimer && (
              <div
                aria-label={`${timeLeftSec} seconds remaining`}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-pastel-peach/45 text-xs font-mono text-pastel-peach"
              >
                <svg width="24" height="24" viewBox="0 0 36 36" className="-rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#FFB5A7"
                    strokeWidth="3"
                    strokeDasharray={timerCircumference}
                    strokeDashoffset={timerDashOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <span>{timeLeftSec}s</span>
              </div>
            )}
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text pt-1">
            Compare the Skies
          </h2>
          <p className="text-sm text-cosmic-muted">
            Two photos of the same sky, taken on different days. Find everything
            that changed.
          </p>
        </div>

        {/* Helper Buttons: "Blink them" (-40 pts, B) & "Hint" (-30 pts, H) */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isRoundComplete || isOutOfLives || blinkOverlayActive}
            onClick={triggerBlinkHelper}
            aria-label="Overlay Visit 2 on Visit 1 and blink for 3 seconds (costs 40 points, shortcut B)"
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
              blinkOverlayActive
                ? "bg-pastel-sky/30 border-pastel-sky text-cosmic-text"
                : !isRoundComplete && !isOutOfLives
                ? "bg-pastel-sky/15 border-pastel-sky/45 text-pastel-sky hover:bg-pastel-sky/25"
                : "bg-white/[0.04] border-white/10 text-cosmic-muted/50 cursor-not-allowed"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              {blinkOverlayActive ? "Blinking (3s)…" : "Blink them (−40 pts)"}
            </span>
          </button>

          <button
            type="button"
            disabled={isRoundComplete || isOutOfLives}
            onClick={triggerHintHelper}
            aria-label="Circle one unfound change area (costs 30 points, shortcut H)"
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
              !isRoundComplete && !isOutOfLives
                ? "bg-pastel-peach/15 border-pastel-peach/45 text-pastel-peach hover:bg-pastel-peach/25"
                : "bg-white/[0.04] border-white/10 text-cosmic-muted/50 cursor-not-allowed"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Hint (−30 pts)</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Canvases (Visit 1 & Visit 2; stacked on mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Visit 1 Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-pastel-sky">
              {blinkOverlayActive
                ? blinkShowVisit2
                  ? "Visit 2 (Blinking overlay)"
                  : "Visit 1 (Blinking overlay)"
                : "Visit 1"}
            </span>
            <span className="text-[11px] text-cosmic-muted">
              First pass
            </span>
          </div>

          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-[#B5EAD7]/65 shadow-[0_0_24px_-4px_rgba(181,234,215,0.28)] bg-[#07061A]">
            <canvas
              ref={canvas1Ref}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={(e) => handleCanvasTap(1, e)}
              aria-label="Visit 1 sky photo. Tap any star that moved, brightened, appeared, or disappeared."
              className="w-full h-full block cursor-crosshair select-none"
            />
          </div>
        </div>

        {/* Visit 2 Canvas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-pastel-peach">
              Visit 2
            </span>
            <span className="text-[11px] text-cosmic-muted">
              Second pass · <span className="font-mono">{roundData.changes.length}</span>{" "}
              {roundData.changes.length === 1 ? "change" : "changes"}
            </span>
          </div>

          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-[#B5EAD7]/65 shadow-[0_0_24px_-4px_rgba(181,234,215,0.28)] bg-[#07061A]">
            <canvas
              ref={canvas2Ref}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={(e) => handleCanvasTap(2, e)}
              aria-label="Visit 2 sky photo. Tap any star that moved, brightened, appeared, or disappeared."
              className="w-full h-full block cursor-crosshair select-none"
            />
          </div>
        </div>
      </div>

      {/* Out of Lives Card, Round Complete Row, or Instructions Footer */}
      {isOutOfLives ? (
        <div className="glass p-5 rounded-2xl bg-pastel-peach/15 border border-pastel-peach/55 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-pastel-peach font-heading font-bold text-base sm:text-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {timeLeftSec <= 0 && levelConfig.hasTimer
                  ? "Time's up! Missed changes are circled above."
                  : "Out of lives! Missed changes are circled above."}
              </span>
            </div>
            <p className="text-xs text-cosmic-text">
              Inspect the dashed peach circles on Visit 1 and Visit 2 to see
              what changed, then try a fresh sky.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound("click");
              setRetryCounter((c) => c + 1);
            }}
            className="min-h-[44px] shrink-0 px-6 py-2.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-pastel-peach"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try again</span>
          </button>
        </div>
      ) : isRoundComplete ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setRevealOpen(true);
            }}
            className="min-h-[44px] px-4 py-2 rounded-full bg-pastel-mint/15 hover:bg-pastel-mint/25 border border-pastel-mint/45 text-pastel-mint text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              View 3D Discovery (+{roundData.changes.length * 60} pts)
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound("whoosh");
              onNextRound();
            }}
            className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow inline-flex items-center gap-2"
          >
            <span>Next sky</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-cosmic-muted">
          <span>
            Look for <strong className="text-cosmic-text">Moved</strong>,{" "}
            <strong className="text-cosmic-text">Brighter</strong>,{" "}
            <strong className="text-cosmic-text">New</strong>, or{" "}
            <strong className="text-cosmic-text">Gone</strong> dots (+60 pts
            each · Shortcuts: <code className="text-cosmic-text">B</code> =
            Blink, <code className="text-cosmic-text">H</code> = Hint)
          </span>

          <button
            type="button"
            onClick={() => {
              playSound("click");
              onNextRound();
            }}
            className="min-h-[44px] px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-cosmic-muted hover:text-cosmic-text inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Skip sky</span>
          </button>
        </div>
      )}

      {/* FoundReveal 3D Modal */}
      <FoundReveal
        open={revealOpen}
        objectType={roundData.revealType}
        pointsEarned={roundData.changes.length * 60}
        speedBonus={0}
        onNext={() => {
          setRevealOpen(false);
          onNextRound();
        }}
        onClose={() => setRevealOpen(false)}
      />
    </div>
  );
}

