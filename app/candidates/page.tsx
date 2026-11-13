"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Crosshair,
  ArrowUpRight,
  Trash2,
  Download,
  Copy,
  Check,
  ArrowUpDown,
  Compass,
  Sparkles,
} from "lucide-react";
import type { CandidateRecord } from "@/types";
import {
  getCandidates,
  removeCandidate,
  CANDIDATES_UPDATED_EVENT,
} from "@/lib/candidates";
import { formatRA, formatDec } from "@/lib/coords";
import { PageTransition } from "@/components/PageTransition";
import { useSound } from "@/components/SoundProvider";

type FilterOption = "All" | "Movers" | "Changing brightness" | "Still";
type SortOption = "newest" | "motion";

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const timeMs = date.getTime();
  if (Number.isNaN(timeMs)) return "Recently";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  if (diffSeconds < 45) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} ${diffMonths === 1 ? "month" : "months"} ago`;
}

function directionToRotationDeg(direction: string): number {
  const d = direction.toLowerCase();
  if (d.includes("up") && d.includes("right")) return -45;
  if (d.includes("up") && d.includes("left")) return -135;
  if (d.includes("down") && d.includes("right")) return 45;
  if (d.includes("down") && d.includes("left")) return 135;
  if (d.includes("up")) return -90;
  if (d.includes("down")) return 90;
  if (d.includes("left")) return 180;
  return 0; // right or default
}

function getVerdictTheme(verdict: CandidateRecord["verdict"]) {
  if (verdict === "Mover") {
    return {
      color: "#FFB5A7",
      badgeClass:
        "bg-[#FFB5A7]/15 border-[#FFB5A7]/45 text-[#FFB5A7]",
      thumbBorderClass:
        "border-[#FFB5A7]/70 shadow-[0_0_18px_rgba(255,181,167,0.38)]",
    };
  }
  if (verdict === "Changing brightness") {
    return {
      color: "#FFC8DD",
      badgeClass:
        "bg-[#FFC8DD]/15 border-[#FFC8DD]/45 text-[#FFC8DD]",
      thumbBorderClass:
        "border-[#FFC8DD]/70 shadow-[0_0_18px_rgba(255,200,221,0.38)]",
    };
  }
  return {
    color: "#B5EAD7",
    badgeClass:
      "bg-[#B5EAD7]/15 border-[#B5EAD7]/45 text-[#B5EAD7]",
    thumbBorderClass:
      "border-[#B5EAD7]/70 shadow-[0_0_18px_rgba(181,234,215,0.38)]",
  };
}

function TelescopeIllustration() {
  return (
    <svg
      viewBox="0 0 160 140"
      className="w-32 h-28 mx-auto"
      fill="none"
      aria-hidden="true"
    >
      {/* Twinkling background stars */}
      <circle cx="28" cy="26" r="2" fill="#C3B1E1" opacity="0.8" />
      <circle cx="132" cy="24" r="2.5" fill="#FFB5A7" opacity="0.9" />
      <circle cx="114" cy="54" r="1.5" fill="#B5EAD7" opacity="0.75" />
      <circle cx="42" cy="62" r="1.5" fill="#A2D2FF" opacity="0.7" />
      {/* Sightline beam */}
      <path
        d="M96 42L142 16"
        stroke="#FFD166"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        opacity="0.75"
      />
      {/* Telescope barrel */}
      <g transform="rotate(-26 78 60)">
        <rect
          x="42"
          y="48"
          width="58"
          height="20"
          rx="6"
          fill="#1A1040"
          stroke="#C3B1E1"
          strokeWidth="2"
        />
        <rect
          x="94"
          y="45"
          width="14"
          height="26"
          rx="4"
          fill="#251959"
          stroke="#FFB5A7"
          strokeWidth="2"
        />
        <rect
          x="32"
          y="53"
          width="12"
          height="10"
          rx="3"
          fill="#0B0B1E"
          stroke="#A2D2FF"
          strokeWidth="1.8"
        />
      </g>
      {/* Mount & tripod */}
      <circle
        cx="74"
        cy="72"
        r="7"
        fill="#1A1040"
        stroke="#EDEBFF"
        strokeWidth="2"
      />
      <path
        d="M74 79L48 122M74 79L74 124M74 79L100 122"
        stroke="#C3B1E1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M36 124H112"
        stroke="#A2D2FF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [mounted, setMounted] = useState(false);
  const [filterOption, setFilterOption] = useState<FilterOption>("All");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [candidateToDelete, setCandidateToDelete] =
    useState<CandidateRecord | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  useEffect(() => {
    setMounted(true);
    const sync = () => setCandidates(getCandidates());
    sync();
    window.addEventListener(CANDIDATES_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CANDIDATES_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const filteredAndSorted = useMemo(() => {
    const filtered = candidates.filter((item) => {
      if (filterOption === "All") return true;
      if (filterOption === "Movers") return item.verdict === "Mover";
      if (filterOption === "Changing brightness") {
        return item.verdict === "Changing brightness";
      }
      if (filterOption === "Still") return item.verdict === "Still star";
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortOption === "motion") {
        return (b.displacementArcsec || 0) - (a.displacementArcsec || 0);
      }
      const timeA = new Date(a.createdAt).getTime() || 0;
      const timeB = new Date(b.createdAt).getTime() || 0;
      return timeB - timeA;
    });
  }, [candidates, filterOption, sortOption]);

  const getViewerHref = (item: CandidateRecord) => {
    const params = new URLSearchParams();
    params.set("ra", item.ra.toFixed(4));
    params.set("dec", item.dec.toFixed(4));
    if (item.targetId) {
      params.set("target", item.targetId);
    }
    return `/viewer?${params.toString()}`;
  };

  const handleCopyLink = async (item: CandidateRecord) => {
    playSound("click");
    const rel = getViewerHref(item);
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${rel}` : rel;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === item.id ? null : prev));
      }, 2200);
    } catch {
      // Clipboard blocked fallback
    }
  };

  const handleExportJson = () => {
    playSound("click");
    const jsonString = JSON.stringify(candidates, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "candidates.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = () => {
    if (!candidateToDelete) return;
    playSound("click");
    const updated = removeCandidate(candidateToDelete.id);
    setCandidates(updated);
    setCandidateToDelete(null);
  };

  const FILTER_CHIPS: FilterOption[] = [
    "All",
    "Movers",
    "Changing brightness",
    "Still",
  ];

  return (
    <PageTransition className="max-w-[1240px] mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <header className="glass p-7 sm:p-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-peach/15 border border-pastel-peach/35 text-pastel-peach">
            <Crosshair className="w-3.5 h-3.5" />
            <span>Citizen Science Detections</span>
          </span>

          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-white/[0.08] border border-white/15 text-cosmic-text">
            <Sparkles className="w-3.5 h-3.5 text-pastel-lavender" />
            <span>
              {candidates.length}{" "}
              {candidates.length === 1 ? "candidate" : "candidates"}
            </span>
          </span>
        </div>

        <div className="space-y-2 max-w-2xl">
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
            Candidates Board
          </h1>
          <p className="text-cosmic-muted text-base sm:text-lg leading-relaxed">
            Objects detectives have marked as interesting. Each one is a lead
            worth a second look.
          </p>
        </div>
      </header>

      {/* Top Toolbar */}
      <section
        aria-label="Filter and sort candidates"
        className="glass p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_CHIPS.map((chip) => {
            const active = filterOption === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  playSound("click");
                  setFilterOption(chip);
                }}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender ${
                  active
                    ? "bg-pastel-peach/25 border border-pastel-peach text-cosmic-text shadow-sm"
                    : "bg-white/[0.05] border border-white/10 text-cosmic-muted hover:text-cosmic-text hover:bg-white/[0.1]"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Sort + Count Chip + Export JSON */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort Segmented Control */}
          <div
            role="group"
            aria-label="Sort candidates"
            className="inline-flex items-center rounded-full bg-white/[0.05] border border-white/15 p-1"
          >
            <span className="pl-3 pr-1.5 text-cosmic-muted flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </span>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setSortOption("newest");
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender ${
                sortOption === "newest"
                  ? "bg-pastel-lavender/25 text-cosmic-text border border-pastel-lavender/50"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              Newest
            </button>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setSortOption("motion");
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender ${
                sortOption === "motion"
                  ? "bg-pastel-lavender/25 text-cosmic-text border border-pastel-lavender/50"
                  : "text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              Biggest motion
            </button>
          </div>

          {/* Count Chip */}
          <span className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-full text-xs font-mono bg-white/[0.06] border border-white/15 text-cosmic-muted">
            {filteredAndSorted.length}{" "}
            {filteredAndSorted.length === 1 ? "candidate" : "candidates"}
          </span>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={handleExportJson}
            disabled={candidates.length === 0}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] disabled:opacity-40 disabled:pointer-events-none text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
          >
            <Download className="w-3.5 h-3.5 text-pastel-sky" />
            <span>Export JSON</span>
          </button>
        </div>
      </section>

      {/* Main Content: Empty State or Responsive 1/2/3 Col Grid */}
      {!mounted ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((skeleton) => (
            <div
              key={skeleton}
              className="glass p-6 h-72 animate-pulse bg-white/[0.04]"
            />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <section className="glass p-10 sm:p-14 text-center max-w-xl mx-auto space-y-6">
          <TelescopeIllustration />
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-bold text-cosmic-text">
              No candidates yet
            </h2>
            <p className="text-cosmic-muted text-sm sm:text-base leading-relaxed">
              No candidates yet. Investigate the sky and mark anything that
              moves.
            </p>
          </div>
          <div>
            <Link
              href="/explore"
              onClick={() => playSound("whoosh")}
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
            >
              <Compass className="w-4 h-4" />
              <span>Start Investigating</span>
            </Link>
          </div>
        </section>
      ) : filteredAndSorted.length === 0 ? (
        <section className="glass p-10 text-center space-y-4">
          <p className="text-cosmic-muted text-sm">
            No candidates match the filter{" "}
            <span className="text-cosmic-text font-semibold">
              {filterOption}
            </span>
            .
          </p>
          <button
            type="button"
            onClick={() => {
              playSound("click");
              setFilterOption("All");
            }}
            className="min-h-[44px] inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
          >
            Show all candidates
          </button>
        </section>
      ) : (
        <section
          aria-label="Saved candidate cards"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAndSorted.map((item) => {
            const theme = getVerdictTheme(item.verdict);
            const displayTarget =
              item.target && item.target.trim().length > 0
                ? item.target
                : "Unnamed object";
            const arrowDeg = directionToRotationDeg(item.direction || "right");
            const isStationary =
              !item.direction ||
              item.direction.toLowerCase().includes("stationary");

            return (
              <motion.article
                key={item.id}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  {/* Top Row: Verdict Badge + Relative Time */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${theme.badgeClass}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span>{item.verdict}</span>
                    </span>

                    <span className="text-xs font-mono text-cosmic-muted">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {/* Thumbnail (128px crop, pixelated) + Object Info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 overflow-hidden shrink-0 bg-[#07061A] flex items-center justify-center ${theme.thumbBorderClass}`}
                    >
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnail}
                          alt={`128px sky crop for ${displayTarget}`}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover [image-rendering:pixelated]"
                        />
                      ) : (
                        <svg
                          viewBox="0 0 64 64"
                          className="w-full h-full [image-rendering:pixelated]"
                          aria-label={`Synthetic sky crop for ${displayTarget}`}
                        >
                          <rect width="64" height="64" fill="#07061A" />
                          <circle cx="14" cy="18" r="1.2" fill="#CFCBEA" />
                          <circle cx="48" cy="14" r="1.5" fill="#EDEBFF" />
                          <circle cx="52" cy="46" r="1.2" fill="#A2D2FF" />
                          <circle cx="18" cy="50" r="1.0" fill="#CFCBEA" />
                          <circle
                            cx="32"
                            cy="32"
                            r="3.5"
                            fill={theme.color}
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="8"
                            fill="none"
                            stroke={theme.color}
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="space-y-1.5 min-w-0 flex-1">
                      <h2 className="font-heading text-lg sm:text-xl font-bold text-cosmic-text truncate">
                        {displayTarget}
                      </h2>
                      <p className="text-xs font-mono text-pastel-sky leading-relaxed">
                        {formatRA(item.ra)}
                        <br />
                        {formatDec(item.dec)}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-2 text-xs font-mono text-cosmic-text">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/10">
                          {item.displacementArcsec.toFixed(1)}″ moved
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.07] border border-white/10">
                          {item.speed.toFixed(4)}″/day
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direction Mini-Arrow Row */}
                  <div className="flex items-center gap-2 text-xs text-cosmic-muted bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2">
                    <span
                      className="w-6 h-6 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center shrink-0"
                      title={`Direction: ${item.direction || "stationary"}`}
                    >
                      {isStationary ? (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: theme.color }}
                        />
                      ) : (
                        <svg
                          viewBox="0 0 16 16"
                          className="w-3.5 h-3.5"
                          style={{ transform: `rotate(${arrowDeg}deg)` }}
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8H13M13 8L9 4M13 8L9 12"
                            stroke={theme.color}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">
                      Direction:{" "}
                      <strong className="text-cosmic-text font-medium">
                        {item.direction || "stationary"}
                      </strong>
                    </span>
                  </div>

                  {/* Detective Note */}
                  {item.note && (
                    <p className="text-xs sm:text-sm text-cosmic-muted leading-relaxed bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                      {item.note}
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <Link
                    href={getViewerHref(item)}
                    onClick={() => playSound("whoosh")}
                    className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
                  >
                    <span>Open in viewer</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(item)}
                    aria-label={`Copy viewer link for ${displayTarget}`}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-white/[0.07] hover:bg-white/[0.14] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-pastel-mint" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-pastel-lavender" />
                        <span>Copy link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setCandidateToDelete(item);
                    }}
                    aria-label={`Remove ${displayTarget} from candidates`}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-pastel-peach/20 text-cosmic-muted hover:text-pastel-peach border border-white/15 hover:border-pastel-peach/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only sm:not-sr-only">Remove</span>
                  </button>
                </div>
              </motion.article>
            );
          })}
        </section>
      )}

      {/* Glass Confirmation Modal for Removing a Candidate */}
      <AnimatePresence>
        {candidateToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0B1E]/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-candidate-title"
          >
            <motion.div
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { scale: 0.95, opacity: 0 }
              }
              animate={{ scale: 1, opacity: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { scale: 0.95, opacity: 0 }
              }
              className="glass max-w-md w-full p-6 sm:p-7 space-y-5 border border-white/25 shadow-glass-glow"
            >
              <div className="space-y-2">
                <h2
                  id="remove-candidate-title"
                  className="font-heading text-xl font-bold text-cosmic-text"
                >
                  Remove candidate lead?
                </h2>
                <p className="text-sm text-cosmic-muted leading-relaxed">
                  Are you sure you want to remove{" "}
                  <strong className="text-cosmic-text">
                    {candidateToDelete.target || "Unnamed object"}
                  </strong>{" "}
                  ({formatRA(candidateToDelete.ra)},{" "}
                  {formatDec(candidateToDelete.dec)}) from your local Candidates
                  Board?
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setCandidateToDelete(null);
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="min-h-[44px] px-5 py-2 rounded-full text-xs font-semibold bg-pastel-peach text-[#0B0B1E] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-peach"
                >
                  Remove Candidate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
