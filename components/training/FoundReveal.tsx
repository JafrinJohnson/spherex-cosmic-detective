"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight,
  BookOpen,
  Orbit,
  Sparkles,
  X,
  FastForward,
} from "lucide-react";
import type { RevealObjectType } from "@/components/training/FoundRevealScene";
import { useSound } from "@/components/SoundProvider";

export type { RevealObjectType };

const FoundRevealScene = dynamic(
  () => import("@/components/training/FoundRevealScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#07061A]">
        <div
          className="w-28 h-28 rounded-full animate-pulse shadow-[0_0_50px_rgba(195,177,225,0.4)]"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #FFB5A7 0%, #C3B1E1 52%, #4B3A8C 95%)",
          }}
        />
      </div>
    ),
  }
);

export interface FoundRevealProps {
  open: boolean;
  objectType: RevealObjectType;
  pointsEarned?: number;
  speedBonus?: number;
  onNext: () => void;
  onClose: () => void;
}

const OBJECT_METADATA: Record<
  RevealObjectType,
  {
    title: string;
    badge: string;
    facts: [string, string, string];
  }
> = {
  asteroid: {
    title: "You found an asteroid!",
    badge: "Solar System Rock",
    facts: [
      "Rocky leftovers from the birth of the planets",
      "Most orbit between Mars and Jupiter",
      "They move fast across the sky, so they jump between photos",
    ],
  },
  comet: {
    title: "You found a comet!",
    badge: "Icy Solar System Traveler",
    facts: [
      "Icy worlds from the cold outer edge of the Solar System",
      "Sunlight warms their ice into a glowing coma and tail",
      "Their tails always point away from the Sun",
    ],
  },
  "brown-dwarf": {
    title: "You found a brown dwarf!",
    badge: "Substellar Neighbor",
    facts: [
      "Too big to be a planet, too small to be a star",
      "They glow mostly in infrared",
      "WISE 0855 is the coldest one known",
    ],
  },
  "red-dwarf": {
    title: "You found a red dwarf!",
    badge: "Fast Nearby Star",
    facts: [
      "The most common stars in our Milky Way galaxy",
      "Cooler and smaller than our Sun, glowing deep red-orange",
      "Nearby red dwarfs like Barnard's Star race across our sky",
    ],
  },
  "variable-star": {
    title: "You found a variable star!",
    badge: "Pulsing Infrared Star",
    facts: [
      "Stars whose brightness swells and dims over time",
      "Young stars and aging red giants often pulse in infrared",
      "Comparing photos across months reveals their changing glow",
    ],
  },
};

export function pickWeightedObjectType(rngValue: number): RevealObjectType {
  // Weighted: asteroid 40%, comet 20%, brown-dwarf 20%, red-dwarf 10%, variable-star 10%
  if (rngValue < 0.4) return "asteroid";
  if (rngValue < 0.6) return "comet";
  if (rngValue < 0.8) return "brown-dwarf";
  if (rngValue < 0.9) return "red-dwarf";
  return "variable-star";
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export function FoundReveal({
  open,
  objectType,
  pointsEarned = 100,
  speedBonus = 0,
  onNext,
  onClose,
}: FoundRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  // Sequence phase: "zoom" (0..0.55s) -> "comet" (0.55..1.65s) -> "modal"
  const [phase, setPhase] = useState<"zoom" | "comet" | "modal">("modal");
  const [displayPoints, setDisplayPoints] = useState<number>(0);

  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);

  const triggerCelebration = useCallback(() => {
    playSound("success");
    try {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.55 },
        colors: [
          "#C3B1E1",
          "#FFB5A7",
          "#B5EAD7",
          "#A2D2FF",
          "#FFC8DD",
          "#FFD166",
        ],
      });
    } catch {
      // Ignore confetti errors
    }
  }, [playSound]);

  const skipToModal = useCallback(() => {
    setPhase("modal");
    triggerCelebration();
  }, [triggerCelebration]);

  // Orchestrate the 2.5s intro sequence when `open` turns true
  useEffect(() => {
    if (!open) return;

    if (prefersReducedMotion) {
      setPhase("modal");
      triggerCelebration();
      return;
    }

    setPhase("zoom");
    const tComet = window.setTimeout(() => {
      setPhase("comet");
      playSound("whoosh");
    }, 520);

    const tModal = window.setTimeout(() => {
      setPhase("modal");
      triggerCelebration();
    }, 1680);

    return () => {
      window.clearTimeout(tComet);
      window.clearTimeout(tModal);
    };
  }, [open, prefersReducedMotion, playSound, triggerCelebration]);

  // Animate full-screen diagonal comet streak & centre sparkle burst during "comet" phase
  useEffect(() => {
    if (!open || phase !== "comet" || prefersReducedMotion) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const startX = width * 0.08;
    const startY = height * 0.14;
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    const palette = [
      "#FFFFFF",
      "#A2D2FF",
      "#B5EAD7",
      "#FFB5A7",
      "#C3B1E1",
      "#FFD166",
    ];
    let sparkles: SparkleParticle[] = [];
    let burstTriggered = false;
    const startTime = performance.now();
    const streakDuration = 540;
    const totalDuration = 1140;
    let rafId = 0;

    const render = (now: number) => {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, width, height);

      if (elapsed <= streakDuration) {
        const p = Math.min(1, elapsed / streakDuration);
        const eased = 1 - Math.pow(1 - p, 2);
        const curX = startX + (centerX - startX) * eased;
        const curY = startY + (centerY - startY) * eased;

        // Glowing white-blue comet tail behind head
        const tailX = curX - (centerX - startX) * 0.28;
        const tailY = curY - (centerY - startY) * 0.28;
        const tailGrad = ctx.createLinearGradient(curX, curY, tailX, tailY);
        tailGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
        tailGrad.addColorStop(0.35, "rgba(162, 210, 255, 0.78)");
        tailGrad.addColorStop(1, "rgba(162, 210, 255, 0)");

        ctx.save();
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 10;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(curX, curY);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Glowing comet head
        const headGrad = ctx.createRadialGradient(
          curX,
          curY,
          0,
          curX,
          curY,
          28
        );
        headGrad.addColorStop(0, "#FFFFFF");
        headGrad.addColorStop(0.4, "#A2D2FF");
        headGrad.addColorStop(1, "rgba(162, 210, 255, 0)");
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(curX, curY, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        if (!burstTriggered) {
          burstTriggered = true;
          sparkles = Array.from({ length: 64 }, (_, i) => {
            const angle = (i / 64) * Math.PI * 2 + (i % 5) * 0.12;
            const speed = 2.5 + (i % 9) * 1.1;
            return {
              x: centerX,
              y: centerY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2.2 + (i % 4) * 1.4,
              color: palette[i % palette.length],
              alpha: 1,
            };
          });
        }

        const burstProgress = Math.min(
          1,
          (elapsed - streakDuration) / (totalDuration - streakDuration)
        );

        // Expanding central flash ring
        ctx.save();
        ctx.strokeStyle = `rgba(181, 234, 215, ${(1 - burstProgress) * 0.75})`;
        ctx.lineWidth = 3 * (1 - burstProgress);
        ctx.beginPath();
        ctx.arc(centerX, centerY, 24 + burstProgress * 150, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        for (const sp of sparkles) {
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.04;
          sp.alpha = Math.max(0, 1 - burstProgress);

          ctx.save();
          ctx.globalAlpha = sp.alpha;
          ctx.fillStyle = sp.color;
          ctx.shadowColor = sp.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (elapsed < totalDuration) {
        rafId = window.requestAnimationFrame(render);
      }
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, phase, prefersReducedMotion]);

  // Count-up animation for points earned once modal is visible
  useEffect(() => {
    if (!open || phase !== "modal") {
      setDisplayPoints(0);
      return;
    }

    const total = pointsEarned;
    if (prefersReducedMotion) {
      setDisplayPoints(total);
      return;
    }

    const start = performance.now();
    const duration = 550;
    let rafId = 0;

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayPoints(Math.round(total * eased));
      if (p < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [open, phase, pointsEarned, prefersReducedMotion]);

  // Focus trap & Escape handler when modal is open
  useEffect(() => {
    if (!open) return;

    if (phase === "modal") {
      const timer = window.setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        playSound("click");
        onClose();
        return;
      }

      if (e.key === "Tab" && phase === "modal" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [open, phase, onClose, playSound]);

  const meta = OBJECT_METADATA[objectType];
  const basePoints = Math.max(0, pointsEarned - speedBonus);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B1E]/80 backdrop-blur-md"
          onClick={() => {
            if (phase !== "modal") {
              skipToModal();
            } else {
              playSound("click");
              onClose();
            }
          }}
        >
          {/* STEP 1: Pulsing & Zooming Dot Toward Screen Centre */}
          {phase === "zoom" && (
            <div className="relative flex flex-col items-center justify-center gap-6">
              <motion.div
                initial={{ scale: 0.25, opacity: 0.6 }}
                animate={{ scale: [0.35, 1.45, 2.3], opacity: [0.8, 1, 0.95] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD166] via-[#FFB5A7] to-[#B5EAD7] shadow-[0_0_75px_24px_rgba(181,234,215,0.65)]"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipToModal();
                }}
                className="min-h-[44px] px-4 py-2 rounded-full glass text-xs font-medium text-cosmic-text inline-flex items-center gap-1.5"
              >
                <FastForward className="w-3.5 h-3.5 text-pastel-mint" />
                <span>Skip intro</span>
              </button>
            </div>
          )}

          {/* STEP 2: Full-Screen Diagonal Comet Streak & Sparkle Burst Canvas */}
          {phase === "comet" && (
            <>
              <canvas
                ref={overlayCanvasRef}
                className="pointer-events-none fixed inset-0 w-full h-full"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  skipToModal();
                }}
                className="min-h-[44px] fixed bottom-8 right-8 px-4 py-2 rounded-full glass text-xs font-medium text-cosmic-text inline-flex items-center gap-1.5 z-10"
              >
                <FastForward className="w-3.5 h-3.5 text-pastel-mint" />
                <span>Skip intro</span>
              </button>
            </>
          )}

          {/* STEP 3: 3D Object Reveal Glass Modal */}
          {phase === "modal" && (
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="found-reveal-title"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 0.9, opacity: 0, y: 14 }
              }
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 0.94, opacity: 0 }
              }
              transition={{ duration: 0.28, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="glass max-w-2xl w-full p-6 sm:p-8 space-y-6 border border-[#B5EAD7]/55 shadow-[0_0_60px_rgba(181,234,215,0.28)] max-h-[92vh] overflow-y-auto"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-medium bg-pastel-mint/20 border border-pastel-mint/45 text-pastel-mint">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{meta.badge}</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    onClose();
                  }}
                  aria-label="Close reveal modal"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 text-cosmic-muted hover:text-cosmic-text transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Modal Grid: 3D R3F Viewer + Facts & Points */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* 3D Object Canvas */}
                <div className="md:col-span-6 flex flex-col items-center">
                  <div className="w-full h-[240px] sm:h-[260px] rounded-2xl overflow-hidden border border-white/15 bg-[#07061A] cursor-grab active:cursor-grabbing relative">
                    <FoundRevealScene
                      objectType={objectType}
                      reducedMotion={Boolean(prefersReducedMotion)}
                    />
                    <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B0B1E]/80 border border-white/15 text-[11px] text-cosmic-muted whitespace-nowrap">
                      <Orbit className="w-3 h-3 text-pastel-lavender" />
                      <span>Drag to spin 360°</span>
                    </div>
                  </div>
                </div>

                {/* Title, 3 Real Facts & Animated Points */}
                <div className="md:col-span-6 space-y-4">
                  <h2
                    id="found-reveal-title"
                    className="font-heading text-2xl sm:text-3xl font-bold text-gradient-headline leading-tight"
                  >
                    {meta.title}
                  </h2>

                  <ul className="space-y-2.5 text-xs sm:text-sm text-cosmic-text">
                    {meta.facts.map((fact) => (
                      <li
                        key={fact}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10"
                      >
                        <span className="w-2 h-2 rounded-full bg-pastel-mint mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{fact}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Points Earned Counter */}
                  <div className="p-3.5 rounded-2xl bg-[#FFD166]/10 border border-[#FFD166]/35 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-pastel-peach">
                        Points earned
                      </div>
                      <div className="text-xs text-cosmic-muted font-mono">
                        +{basePoints} base
                        {speedBonus > 0 ? ` · +${speedBonus} speed bonus` : ""}
                      </div>
                    </div>
                    <div className="font-mono text-2xl sm:text-3xl font-medium text-[#FFD166]">
                      +{displayPoints}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-end gap-3">
                <Link
                  href="/about"
                  onClick={() => playSound("click")}
                  className="min-h-[44px] px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-cosmic-text inline-flex items-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
                >
                  <BookOpen className="w-4 h-4 text-pastel-sky" />
                  <span>Learn more</span>
                </Link>

                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={() => {
                    playSound("whoosh");
                    onNext();
                  }}
                  className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center gap-2 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-peach"
                >
                  <span>Next sky</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

