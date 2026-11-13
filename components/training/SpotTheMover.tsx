"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  Telescope,
} from "lucide-react";
import type { Target, TargetMeta } from "@/types";
import { useSound } from "@/components/SoundProvider";

export interface RoundOutcome {
  roundId: number;
  level: 1 | 2 | 3 | 4;
  dx: number;
  dy: number;
  directionWords: string;
  oppositeDirectionWords: string;
  hasDecoy: boolean;
  photosCompared: number;
  elapsedSeconds: number;
  missedInRound: boolean;
  pointsEarned: number;
}

export interface RealSkyBundle {
  target: Target;
  meta: TargetMeta;
}

interface SpotTheMoverProps {
  moversFound: number;
  roundNumber: number;
  realSkyBundles: RealSkyBundle[];
  onHit: (outcome: RoundOutcome) => void;
  onMiss: () => void;
  onUseHint: () => void;
  onNextSky: () => void;
  hintTriggerSeq: number;
}

interface StarParticle {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

const LOGICAL_WIDTH = 512;
const LOGICAL_HEIGHT = 460;

// Seeded PRNG (Mulberry32) so a round can be replayed deterministically
function createSeededRng(seed: number) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIRECTIONS_POOL = [
  {
    dx: 0.8,
    dy: -0.6,
    words: "Up and to the right",
    opposite: "Down and to the left",
  },
  {
    dx: -0.8,
    dy: -0.6,
    words: "Up and to the left",
    opposite: "Down and to the right",
  },
  {
    dx: 0.8,
    dy: 0.6,
    words: "Down and to the right",
    opposite: "Up and to the left",
  },
  {
    dx: -0.8,
    dy: 0.6,
    words: "Down and to the left",
    opposite: "Up and to the right",
  },
  {
    dx: 1.0,
    dy: 0.0,
    words: "Straight to the right",
    opposite: "Straight to the left",
  },
  {
    dx: -1.0,
    dy: 0.0,
    words: "Straight to the left",
    opposite: "Straight to the right",
  },
];

export function SpotTheMover({
  moversFound,
  roundNumber,
  realSkyBundles,
  onHit,
  onMiss,
  onUseHint,
  onNextSky,
  hintTriggerSeq,
}: SpotTheMoverProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine level automatically every 3 finds (L1..L4)
  const level: 1 | 2 | 3 | 4 = useMemo(() => {
    if (moversFound >= 9) return 4;
    if (moversFound >= 6) return 3;
    if (moversFound >= 3) return 2;
    return 1;
  }, [moversFound]);

  const levelConfig = useMemo(() => {
    switch (level) {
      case 1:
        return { starsCount: 15, shiftPx: 20, blinkMs: 650, hasDecoy: false };
      case 2:
        return { starsCount: 30, shiftPx: 12, blinkMs: 650, hasDecoy: false };
      case 3:
        return { starsCount: 45, shiftPx: 8, blinkMs: 650, hasDecoy: true };
      case 4:
        return { starsCount: 60, shiftPx: 5, blinkMs: 500, hasDecoy: true };
    }
  }, [level]);

  // Check if Real Sky bundles have the "mover" field in meta.json
  const validRealSkyBundles = useMemo(
    () =>
      realSkyBundles.filter(
        (b) => Array.isArray(b.meta.mover) && b.meta.mover.length >= 2
      ),
    [realSkyBundles]
  );
  const canUseRealSky = validRealSkyBundles.length > 0;

  const [useRealSky, setUseRealSky] = useState<boolean>(false);
  const [realImagesLoaded, setRealImagesLoaded] = useState<{
    imgA: HTMLImageElement | null;
    imgB: HTMLImageElement | null;
  }>({ imgA: null, imgB: null });

  // Photo A (0) vs Photo B (1)
  const [photoIndex, setPhotoIndex] = useState<0 | 1>(0);
  const [foundInRound, setFoundInRound] = useState<boolean>(false);
  const [missedInRound, setMissedInRound] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [lastPointsAwarded, setLastPointsAwarded] = useState<number>(100);

  const roundStartRef = useRef<number>(performance.now());
  const hitEffectRef = useRef<{
    x: number;
    y: number;
    startedAt: number;
  } | null>(null);
  const missRipplesRef = useRef<
    Array<{ x: number; y: number; startedAt: number }>
  >([]);
  const hintStartedAtRef = useRef<number | null>(null);

  // Generate deterministic round data (stars, mover positions, decoy star)
  const roundData = useMemo(() => {
    const rng = createSeededRng(roundNumber * 7919 + level * 101);
    const palette = ["#EDEBFF", "#C3B1E1", "#A2D2FF", "#FFB5A7", "#B5EAD7"];

    if (useRealSky && canUseRealSky) {
      const bundle =
        validRealSkyBundles[(roundNumber - 1) % validRealSkyBundles.length];
      const moverArr = bundle.meta.mover!;
      const firstPt = moverArr[0];
      const lastPt = moverArr[moverArr.length - 1];

      // Scale 512x512 coordinates into LOGICAL_WIDTH x LOGICAL_HEIGHT (512 x 460)
      const scaleY = LOGICAL_HEIGHT / 512;
      const posA = { x: firstPt.x, y: firstPt.y * scaleY };
      const posB = { x: lastPt.x, y: lastPt.y * scaleY };
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;

      return {
        isReal: true,
        bundle,
        stars: [] as StarParticle[],
        posA,
        posB,
        dx,
        dy,
        directionWords:
          dy < 0 && dx > 0
            ? "Up and to the right"
            : dy < 0 && dx < 0
            ? "Up and to the left"
            : "Across the sky",
        oppositeDirectionWords:
          dy < 0 && dx > 0
            ? "Down and to the left"
            : dy < 0 && dx < 0
            ? "Down and to the right"
            : "Opposite direction",
        decoy: null as { x: number; y: number; radius: number } | null,
      };
    }

    const stars: StarParticle[] = [];
    for (let i = 0; i < levelConfig.starsCount; i++) {
      stars.push({
        x: 36 + rng() * (LOGICAL_WIDTH - 72),
        y: 36 + rng() * (LOGICAL_HEIGHT - 72),
        radius: 1.3 + Math.pow(rng(), 2.1) * 2.8,
        color: palette[Math.floor(rng() * palette.length)],
        alpha: 0.45 + rng() * 0.5,
      });
    }

    const dir = DIRECTIONS_POOL[Math.floor(rng() * DIRECTIONS_POOL.length)];
    const startX = 95 + rng() * (LOGICAL_WIDTH - 190);
    const startY = 85 + rng() * (LOGICAL_HEIGHT - 170);
    const posA = { x: startX, y: startY };
    const posB = {
      x: startX + dir.dx * levelConfig.shiftPx,
      y: startY + dir.dy * levelConfig.shiftPx,
    };

    const decoy = levelConfig.hasDecoy
      ? {
          x: 80 + rng() * (LOGICAL_WIDTH - 160),
          y: 80 + rng() * (LOGICAL_HEIGHT - 160),
          radius: 3.1,
        }
      : null;

    return {
      isReal: false,
      bundle: null,
      stars,
      posA,
      posB,
      dx: posB.x - posA.x,
      dy: posB.y - posA.y,
      directionWords: dir.words,
      oppositeDirectionWords: dir.opposite,
      decoy,
    };
  }, [
    roundNumber,
    level,
    levelConfig,
    useRealSky,
    canUseRealSky,
    validRealSkyBundles,
  ]);

  // Preload Real Sky Photo A (frame 0) and Photo B (last frame) when in Real Sky mode
  useEffect(() => {
    if (!roundData.isReal || !roundData.bundle) {
      setRealImagesLoaded({ imgA: null, imgB: null });
      return;
    }

    let cancelled = false;
    const frames = roundData.bundle.meta.frames;
    const frameA = frames[0];
    const frameB = frames[frames.length - 1];

    const loadImg = (url: string) =>
      new Promise<HTMLImageElement | null>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });

    Promise.all([
      loadImg(
        frameA.url ||
          `/data/${roundData.bundle.target.id}/frames/${frameA.file}`
      ),
      loadImg(
        frameB.url ||
          `/data/${roundData.bundle.target.id}/frames/${frameB.file}`
      ),
    ]).then(([imgA, imgB]) => {
      if (!cancelled) {
        setRealImagesLoaded({ imgA, imgB });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roundData]);

  // Reset round state when roundNumber or mode changes
  useEffect(() => {
    setFoundInRound(false);
    setMissedInRound(false);
    setElapsedSec(0);
    setHintActive(false);
    roundStartRef.current = performance.now();
    hitEffectRef.current = null;
    missRipplesRef.current = [];
    hintStartedAtRef.current = null;
  }, [roundNumber, useRealSky]);

  // Elapsed timer for 8s Hint unlock and speed tracking
  useEffect(() => {
    if (foundInRound) return;
    const timer = window.setInterval(() => {
      const sec = (performance.now() - roundStartRef.current) / 1000;
      setElapsedSec(sec);
    }, 250);
    return () => window.clearInterval(timer);
  }, [foundInRound, roundNumber]);

  // Hard-cut Blink timer (650 ms, or 500 ms on L4, or 1200 ms if prefers-reduced-motion)
  useEffect(() => {
    const blinkInterval = prefersReducedMotion ? 1200 : levelConfig.blinkMs;
    const id = window.setInterval(() => {
      setPhotoIndex((prev) => (prev === 0 ? 1 : 0));
    }, blinkInterval);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, levelConfig.blinkMs]);

  const triggerHint = useCallback(() => {
    if (foundInRound || elapsedSec < 8) return;
    playSound("click");
    setHintActive(true);
    hintStartedAtRef.current = performance.now();
    onUseHint();
  }, [foundInRound, elapsedSec, playSound, onUseHint]);

  // Listen to parent keyboard 'H' hint trigger
  useEffect(() => {
    if (hintTriggerSeq > 0) {
      triggerHint();
    }
  }, [hintTriggerSeq, triggerHint]);

  // Canvas render loop (draws stars, mover, decoy, hit burst, miss ripples, and hint circle)
  useEffect(() => {
    let rafId = 0;

    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear dark #07061A background
      ctx.fillStyle = "#07061A";
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      if (
        roundData.isReal &&
        realImagesLoaded.imgA &&
        realImagesLoaded.imgB
      ) {
        const activeImg =
          photoIndex === 0 ? realImagesLoaded.imgA : realImagesLoaded.imgB;
        ctx.drawImage(activeImg, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      } else {
        // Faint pixel grid
        ctx.strokeStyle = "rgba(195, 177, 225, 0.06)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= LOGICAL_WIDTH; x += 32) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, LOGICAL_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= LOGICAL_HEIGHT; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(LOGICAL_WIDTH, y);
          ctx.stroke();
        }

        // Static field stars with soft radial glow
        for (const star of roundData.stars) {
          const grad = ctx.createRadialGradient(
            star.x,
            star.y,
            0,
            star.x,
            star.y,
            star.radius * 3.2
          );
          grad.addColorStop(0, star.color);
          grad.addColorStop(0.45, `${star.color}66`);
          grad.addColorStop(1, "rgba(7, 6, 26, 0)");

          ctx.save();
          ctx.globalAlpha = star.alpha;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.radius * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Decoy star on L3 & L4 (stays fixed, only changes brightness between Photo A and Photo B)
        if (roundData.decoy) {
          const d = roundData.decoy;
          const decoyScale = photoIndex === 0 ? 0.58 : 1.48;
          const r = d.radius * decoyScale;
          const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r * 3.4);
          grad.addColorStop(0, "#FFC8DD");
          grad.addColorStop(0.45, "rgba(255, 200, 221, 0.45)");
          grad.addColorStop(1, "rgba(7, 6, 26, 0)");

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(d.x, d.y, r * 3.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#EDEBFF";
          ctx.beginPath();
          ctx.arc(d.x, d.y, r * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }

        // The ONE Mover shifting between Photo A and Photo B
        const moverPos = photoIndex === 0 ? roundData.posA : roundData.posB;
        const mRadius = 3.2;
        const mGrad = ctx.createRadialGradient(
          moverPos.x,
          moverPos.y,
          0,
          moverPos.x,
          moverPos.y,
          mRadius * 3.6
        );
        mGrad.addColorStop(0, "#FFD166");
        mGrad.addColorStop(0.45, "rgba(255, 181, 167, 0.55)");
        mGrad.addColorStop(1, "rgba(7, 6, 26, 0)");

        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(moverPos.x, moverPos.y, mRadius * 3.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(moverPos.x, moverPos.y, mRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Hint Circle if active (lasts 2.8 seconds)
      if (hintStartedAtRef.current !== null) {
        const hintAge = (now - hintStartedAtRef.current) / 1000;
        if (hintAge <= 2.8) {
          const midX = (roundData.posA.x + roundData.posB.x) / 2;
          const midY = (roundData.posA.y + roundData.posB.y) / 2;
          const alpha = Math.sin((hintAge / 2.8) * Math.PI) * 0.85;

          ctx.save();
          ctx.strokeStyle = `rgba(255, 209, 102, ${alpha})`;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(midX, midY, 56, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else {
          hintStartedAtRef.current = null;
          setHintActive(false);
        }
      }

      // Draw Miss Ripples in Peach (#FFB5A7)
      missRipplesRef.current = missRipplesRef.current.filter(
        (r) => now - r.startedAt < 650
      );
      for (const ripple of missRipplesRef.current) {
        const p = (now - ripple.startedAt) / 650;
        const rad = 6 + p * 24;
        const alpha = (1 - p) * 0.85;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 181, 167, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Hit Ring Burst in Mint (#B5EAD7)
      if (hitEffectRef.current) {
        const p = Math.min(1, (now - hitEffectRef.current.startedAt) / 900);
        const cx = hitEffectRef.current.x;
        const cy = hitEffectRef.current.y;

        // Persistent mint target circle
        ctx.save();
        ctx.strokeStyle = "#B5EAD7";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#B5EAD7";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Expanding burst wave
        if (p < 1) {
          const burstR = 14 + p * 44;
          ctx.strokeStyle = `rgba(181, 234, 215, ${(1 - p) * 0.9})`;
          ctx.lineWidth = 3 * (1 - p);
          ctx.beginPath();
          ctx.arc(cx, cy, burstR, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [roundData, photoIndex, realImagesLoaded]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (foundInRound) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
    const clickY = ((e.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;

    const distA = Math.hypot(
      clickX - roundData.posA.x,
      clickY - roundData.posA.y
    );
    const distB = Math.hypot(
      clickX - roundData.posB.x,
      clickY - roundData.posB.y
    );

    // Hit if within 18 px of the mover (either Photo A or Photo B position)
    if (distA <= 18 || distB <= 18) {
      const solveTimeSec = Number(
        ((performance.now() - roundStartRef.current) / 1000).toFixed(2)
      );
      const speedBonus = solveTimeSec < 5 ? 50 : 0;
      const totalPts = 100 + speedBonus;

      setLastPointsAwarded(totalPts);
      setFoundInRound(true);
      hitEffectRef.current = {
        x: (roundData.posA.x + roundData.posB.x) / 2,
        y: (roundData.posA.y + roundData.posB.y) / 2,
        startedAt: performance.now(),
      };

      playSound("success");
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.68 },
        });
      } catch {
        // Ignore confetti errors
      }

      onHit({
        roundId: roundNumber,
        level,
        dx: roundData.dx,
        dy: roundData.dy,
        directionWords: roundData.directionWords,
        oppositeDirectionWords: roundData.oppositeDirectionWords,
        hasDecoy: Boolean(roundData.decoy),
        photosCompared: 2,
        elapsedSeconds: solveTimeSec,
        missedInRound,
        pointsEarned: totalPts,
      });
    } else {
      // Miss -> small peach ripple where tapped, -10 points, soft click sound
      playSound("click");
      setMissedInRound(true);
      missRipplesRef.current.push({
        x: clickX,
        y: clickY,
        startedAt: performance.now(),
      });
      onMiss();
    }
  };

  const canUseHint = !foundInRound && elapsedSec >= 8;
  const secondsUntilHint = Math.max(0, Math.ceil(8 - elapsedSec));

  return (
    <div className="glass p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-pastel-lavender/20 border border-pastel-lavender/45 text-pastel-lavender">
              Level {level}
            </span>

            {/* Live updating Photo A / Photo B glass chip */}
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors ${
                photoIndex === 0
                  ? "bg-pastel-sky/20 border-pastel-sky/50 text-pastel-sky"
                  : "bg-pastel-peach/20 border-pastel-peach/50 text-pastel-peach"
              }`}
            >
              {photoIndex === 0
                ? "Photo A · first visit"
                : "Photo B · next visit"}
            </span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text pt-1">
            Spot the Mover
          </h2>
          <p className="text-sm text-cosmic-muted">
            The photos flip. Stars stay still. Tap the one dot that moves.
          </p>
        </div>

        {/* Real Sky Toggle & Hint Control */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canUseRealSky && (
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setUseRealSky((r) => !r);
              }}
              aria-pressed={useRealSky}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
                useRealSky
                  ? "bg-pastel-sky/25 border-pastel-sky text-cosmic-text"
                  : "bg-white/[0.06] border-white/15 text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              <Telescope className="w-3.5 h-3.5 text-pastel-sky" />
              <span>Real sky: {useRealSky ? "On" : "Off"}</span>
            </button>
          )}

          <button
            type="button"
            disabled={!canUseHint}
            onClick={triggerHint}
            aria-label="Highlight region around the moving object (costs 30 points)"
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
              canUseHint
                ? "bg-pastel-peach/20 border-pastel-peach text-pastel-peach hover:bg-pastel-peach/30 cursor-pointer"
                : "bg-white/[0.04] border-white/10 text-cosmic-muted/60 cursor-not-allowed"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>
              {hintActive
                ? "Hint active"
                : canUseHint
                ? "Hint (−30 pts)"
                : `Hint (${secondsUntilHint}s)`}
            </span>
          </button>
        </div>
      </div>

      {/* Game Area Canvas (~460px tall, dark #07061A, mint glowing border) */}
      <div className="relative w-full h-[360px] sm:h-[460px] rounded-2xl overflow-hidden border border-[#B5EAD7]/65 shadow-[0_0_30px_-4px_rgba(181,234,215,0.3)] bg-[#07061A]">
        <canvas
          ref={canvasRef}
          width={LOGICAL_WIDTH}
          height={LOGICAL_HEIGHT}
          onClick={handleCanvasClick}
          aria-label="Interactive star-field blink game. Tap the star that shifts position."
          className="w-full h-full block cursor-crosshair select-none"
        />

        {/* Top-Right Round & Level Telemetry */}
        <div className="pointer-events-none absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#07061A]/85 backdrop-blur-md border border-white/15 text-[11px] font-mono text-cosmic-muted">
          {roundData.isReal && roundData.bundle
            ? `Real Sky: ${roundData.bundle.target.name}`
            : `Sky #${roundNumber} · ${levelConfig.starsCount} stars · ${levelConfig.shiftPx}px shift`}
        </div>
      </div>

      {/* Bottom Glass Banner when Mover is Found, or Round Controls */}
      {foundInRound ? (
        <div className="glass p-5 rounded-2xl bg-pastel-mint/15 border border-pastel-mint/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-pastel-mint font-heading font-bold text-base sm:text-lg">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Found it! That&apos;s how Pluto was discovered.</span>
            </div>
            <p className="text-xs text-cosmic-text">
              +{lastPointsAwarded} points awarded{" "}
              {lastPointsAwarded > 100
                ? "(includes +50 speed bonus under 5s!)"
                : ""}
              . Answer the bonus question on the right or jump to the next sky.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound("whoosh");
              onNextSky();
            }}
            className="min-h-[44px] shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-peach"
          >
            <span>Next sky</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-cosmic-muted">
          <span>
            Tap within 18 px of the moving dot (+100 pts, +50 under 5s · Miss =
            −10 pts)
          </span>
          <button
            type="button"
            onClick={() => {
              playSound("click");
              onNextSky();
            }}
            className="min-h-[44px] px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-cosmic-muted hover:text-cosmic-text inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Skip / Next sky (N)</span>
          </button>
        </div>
      )}
    </div>
  );
}

