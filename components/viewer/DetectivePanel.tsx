"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  Database,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { checkKnown } from "@/lib/api";
import { addCandidate } from "@/lib/candidates";
import { formatRA, formatDec } from "@/lib/coords";
import type { MotionAnalysisResult } from "@/lib/motion";
import type { KnownObjectCheckResult } from "@/types";
import { useSound } from "@/components/SoundProvider";
import { useAuth } from "@/context/AuthProvider";

interface DetectivePanelProps {
  investigation: MotionAnalysisResult | null;
  thumbnailDataUrl: string;
  targetName: string;
  targetId?: string;
  onClearSelection: () => void;
}

const VERDICT_STYLES = {
  Mover: {
    bg: "bg-[#FFB5A7]/20",
    border: "border-[#FFB5A7]",
    text: "text-[#FFB5A7]",
    dot: "#FFB5A7",
  },
  "Changing brightness": {
    bg: "bg-[#FFC8DD]/20",
    border: "border-[#FFC8DD]",
    text: "text-[#FFC8DD]",
    dot: "#FFC8DD",
  },
  "Still star": {
    bg: "bg-[#B5EAD7]/20",
    border: "border-[#B5EAD7]",
    text: "text-[#B5EAD7]",
    dot: "#B5EAD7",
  },
};

export function DetectivePanel({
  investigation,
  thumbnailDataUrl,
  targetName,
  targetId,
  onClearSelection,
}: DetectivePanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();
  const { user, isGuest } = useAuth();

  const [tipsExpanded, setTipsExpanded] = useState<boolean>(false);
  const [knownResult, setKnownResult] = useState<KnownObjectCheckResult>({
    status: "offline",
    name: null,
  });
  const [checkingKnown, setCheckingKnown] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Explorer role starts with Detective panel tips expanded
  useEffect(() => {
    if (user && !isGuest && user.role === "explorer") {
      setTipsExpanded(true);
    }
  }, [user, isGuest]);

  useEffect(() => {
    setSavedSuccess(false);
    setNote("");
    if (!investigation || !investigation.found) {
      setKnownResult({ status: "offline", name: null });
      return;
    }

    let active = true;
    setCheckingKnown(true);
    checkKnown(investigation.approxRa, investigation.approxDec)
      .then((res) => {
        if (active) setKnownResult(res);
      })
      .finally(() => {
        if (active) setCheckingKnown(false);
      });

    return () => {
      active = false;
    };
  }, [investigation]);

  const handleSaveCandidate = () => {
    if (!investigation || !investigation.found || !investigation.verdict) {
      return;
    }
    playSound("success");
    try {
      confetti({
        particleCount: 38,
        spread: 55,
        origin: { y: 0.72 },
      });
    } catch {
      // Ignore confetti errors in headless environments
    }

    addCandidate({
      ra: investigation.approxRa,
      dec: investigation.approxDec,
      target: targetName,
      targetId,
      verdict: investigation.verdict,
      displacementArcsec: investigation.displacementArcsec,
      speed: investigation.speedArcsecPerDay,
      direction: investigation.directionWords,
      note: note.trim(),
      thumbnail: thumbnailDataUrl,
    });

    setSavedSuccess(true);
  };

  return (
    <div className="glass p-6 sm:p-7 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-bold text-cosmic-text flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pastel-peach" />
          <span>Detective Panel</span>
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setTipsExpanded((v) => !v);
            }}
            aria-expanded={tipsExpanded}
            className="min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium bg-[#A2D2FF]/12 hover:bg-[#A2D2FF]/20 border border-[#A2D2FF]/35 text-[#A2D2FF] inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-sky"
          >
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tips</span>
            {tipsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {investigation && (
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onClearSelection();
              }}
              aria-label="Clear selected object"
              className="min-h-[38px] px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-cosmic-muted hover:text-cosmic-text inline-flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear selection</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Detective Tips (starts expanded for Explorer role) */}
      <AnimatePresence>
        {tipsExpanded && (
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
            <div className="rounded-2xl border border-[#A2D2FF]/30 bg-[#A2D2FF]/[0.07] p-4 text-xs text-[#EDEBFF] space-y-1.5">
              <p className="font-heading font-semibold text-[#A2D2FF]">
                Explorer Field Tips
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[#CFCBEA]">
                <li>
                  Toggle <span className="text-[#EDEBFF] font-medium">Difference</span> mode to highlight moving pairs as bright/dark dipoles.
                </li>
                <li>
                  Objects moving more than <span className="text-[#FFB5A7] font-mono">1.0 px</span> across visits are classified as <span className="text-[#FFB5A7] font-semibold">Movers</span>.
                </li>
                <li>
                  Switch infrared bands (<span className="text-[#FFD166] font-mono">3.4 μm</span> vs <span className="text-[#FFD166] font-mono">4.6 μm</span>) to spot cool brown dwarfs that glow brightest in longer wavelengths.
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* EMPTY STATE */}
        {!investigation && (
          <motion.div
            key="empty-state"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="py-8 px-4 text-center space-y-4 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            {/* Magnifier Illustration (Inline SVG) */}
            <div className="mx-auto w-20 h-20 rounded-full bg-pastel-lavender/10 border border-pastel-lavender/30 flex items-center justify-center">
              <svg
                width="44"
                height="44"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="21"
                  cy="21"
                  r="12"
                  stroke="#C3B1E1"
                  strokeWidth="2.5"
                />
                <circle
                  cx="21"
                  cy="21"
                  r="7"
                  stroke="#FFB5A7"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle cx="23" cy="19" r="2.2" fill="#FFD166" />
                <path
                  d="M30 30L40 40"
                  stroke="#C3B1E1"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-sm font-medium text-cosmic-text max-w-xs mx-auto leading-relaxed">
              Click any dot in the image to investigate it.
            </p>
            <p className="text-xs text-cosmic-muted max-w-xs mx-auto">
              Measures position and brightness across visits.
            </p>
          </motion.div>
        )}

        {/* NO BRIGHT BLOB FOUND */}
        {investigation && !investigation.found && (
          <motion.div
            key="no-blob"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-6 rounded-2xl bg-pastel-peach/10 border border-pastel-peach/35 text-center space-y-3"
          >
            <p className="font-heading text-base font-medium text-pastel-peach">
              {investigation.message ||
                "Nothing bright here. Try clicking right on a dot."}
            </p>
            <p className="text-xs text-cosmic-muted">
              Clicked pixel ({investigation.clickedX}, {investigation.clickedY})
               only contains dark background sky.
            </p>
          </motion.div>
        )}

        {/* INVESTIGATION RESULTS */}
        {investigation && investigation.found && investigation.verdict && (
          <motion.div
            key={`result-${investigation.clickedX}-${investigation.clickedY}`}
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Big Verdict Badge + Crop Preview */}
            {(() => {
              const style = VERDICT_STYLES[investigation.verdict];
              return (
                <div
                  className={`p-4 rounded-2xl border ${style.bg} ${style.border} flex items-center justify-between gap-4`}
                >
                  <div className="space-y-1">
                    <h3 className="text-xs font-medium text-cosmic-muted">
                      Verdict
                    </h3>
                    <div
                      className={`font-heading text-xl sm:text-2xl font-medium flex items-center gap-2.5 ${style.text}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: style.dot }}
                      />
                      <span>{investigation.verdict}</span>
                    </div>
                  </div>

                  {thumbnailDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailDataUrl}
                      alt="128px crop of selected source"
                      className="w-14 h-14 rounded-xl border border-white/25 object-cover shrink-0 bg-[#07090F]"
                    />
                  )}
                </div>
              );
            })()}

            {/* 4-Tile Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tile 1: Moved (arcsec) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15 space-y-1">
                <div className="text-xs text-cosmic-muted">
                  Moved
                </div>
                <div className="font-mono text-xl font-medium text-cosmic-text">
                  {investigation.displacementArcsec.toFixed(1)}″
                </div>
                <div className="text-[11px] font-mono text-pastel-peach">
                  {investigation.displacementPx.toFixed(2)} px total
                </div>
              </div>

              {/* Tile 2: Speed (″/day) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15 space-y-1">
                <div className="text-xs text-cosmic-muted">
                  Speed
                </div>
                <div className="font-mono text-xl font-medium text-cosmic-text">
                  {investigation.speedArcsecPerDay.toFixed(3)}″/day
                </div>
                <div className="text-[11px] font-mono text-pastel-sky">
                  Across {investigation.centroids.length} visits
                </div>
              </div>

              {/* Tile 3: Direction (Mini Compass with Rotating Arrow) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15 space-y-1.5">
                <div className="text-xs text-cosmic-muted">
                  Direction
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#07090F]/80 border border-white/20 flex items-center justify-center shrink-0">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      style={{
                        transform: `rotate(${investigation.directionAngleDeg}deg)`,
                      }}
                      className="transition-transform duration-300"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 12H19M19 12L13 6M19 12L13 18"
                        stroke="#FFD166"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="text-xs font-medium text-cosmic-text leading-tight capitalize">
                    {investigation.directionWords}
                  </div>
                </div>
              </div>

              {/* Tile 4: Brightness Change (%) */}
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15 space-y-1">
                <div className="text-xs text-cosmic-muted">
                  Brightness change
                </div>
                <div className="font-mono text-xl font-medium text-cosmic-text">
                  {investigation.brightnessChangePct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-pastel-mint">
                  Min to max visit
                </div>
              </div>
            </div>

            {/* Position Readout (Pixel x,y and approx. RA/Dec) */}
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-cosmic-muted">Pixel position</span>
                <span className="font-mono font-medium text-cosmic-text">
                  x: {investigation.clickedX} px, y: {investigation.clickedY} px
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-cosmic-muted">
                  Sky position (approx.)
                </span>
                <span className="font-mono text-pastel-sky text-right">
                  {formatRA(investigation.approxRa)}{" "}
                  {formatDec(investigation.approxDec)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-cosmic-muted">
                <span>Decimal (approx.)</span>
                <span>
                  RA {investigation.approxRa.toFixed(4)}° · Dec{" "}
                  {investigation.approxDec >= 0 ? "+" : ""}
                  {investigation.approxDec.toFixed(4)}°
                </span>
              </div>
            </div>

            {/* Known Object Check */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium text-cosmic-text">
                Known object check
              </h3>

              {checkingKnown ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.05] border border-white/15 text-xs text-cosmic-muted flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 animate-pulse text-pastel-lavender" />
                  <span>Checking star catalogs...</span>
                </div>
              ) : knownResult.status === "matched" && knownResult.name ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-[#B5EAD7]/15 border border-[#B5EAD7]/45 text-xs font-medium text-[#B5EAD7] flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span>Known: {knownResult.name}</span>
                </div>
              ) : knownResult.status === "unmatched" ? (
                <div className="px-3.5 py-2.5 rounded-2xl bg-[#FFB5A7]/15 border border-[#FFB5A7]/45 text-xs font-medium text-[#FFB5A7] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>No known star here, interesting!</span>
                </div>
              ) : (
                <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/15 text-xs text-cosmic-muted flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-pastel-lavender shrink-0" />
                  <span>
                    Gaia check runs when the data server is connected.
                  </span>
                </div>
              )}
            </div>

            {/* Optional Note Textarea + "Mark as candidate" Button */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="candidate-note-input"
                  className="block text-xs font-medium text-cosmic-text"
                >
                  Detective note (optional)
                </label>
                <textarea
                  id="candidate-note-input"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Describe what you noticed across the 4 visits..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/15 text-xs text-cosmic-text placeholder:text-cosmic-muted/60 focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveCandidate}
                className="w-full min-h-[44px] py-3 px-5 rounded-full font-heading font-medium text-sm bg-infrared-gradient text-[#07090F] shadow-infrared-glow hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-peach"
              >
                Mark as candidate
              </button>

              {savedSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-pastel-mint/15 border border-pastel-mint/40 flex items-center justify-between gap-2 text-xs text-pastel-mint"
                >
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Saved!</span>
                  </span>
                  <Link
                    href="/candidates"
                    onClick={() => playSound("click")}
                    className="inline-flex items-center gap-1 font-semibold underline hover:text-cosmic-text"
                  >
                    <span>See it on the Candidates board</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

