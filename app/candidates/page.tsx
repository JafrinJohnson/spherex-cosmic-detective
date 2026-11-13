"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Crosshair,
  ArrowUpRight,
  Sparkles,
  Trash2,
  PlusCircle,
} from "lucide-react";
import type { CandidateSubmission } from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const CANDIDATES_STORAGE_KEY = "cosmic-detective-candidates";

const INITIAL_CANDIDATES: CandidateSubmission[] = [
  {
    id: "cand-seed-1",
    targetId: "barnards-star",
    targetName: "Barnard's Star",
    ra: 269.4521,
    dec: 4.6934,
    pixelX: 256,
    pixelY: 245,
    epochDate: "2026-12-01",
    classification: "High Proper Motion",
    confidence: 99,
    notes: "43.5 px linear shift across 4 SPHEREx epochs; strong M-dwarf 1.35 μm continuum peak.",
    createdAt: "2026-11-10",
  },
  {
    id: "cand-seed-2",
    targetId: "wise-0855",
    targetName: "WISE 0855−0714",
    ra: 133.7951,
    dec: -7.2451,
    pixelX: 248,
    pixelY: 252,
    epochDate: "2026-06-01",
    classification: "Brown Dwarf Candidate",
    confidence: 97,
    notes: "Ultracool Y-dwarf signature with steep 4.5 μm flux rise and CH4 absorption troughs.",
    createdAt: "2026-11-11",
  },
  {
    id: "cand-seed-3",
    targetId: "eps-indi-b",
    targetName: "Epsilon Indi B",
    ra: 331.0438,
    dec: -56.7828,
    pixelX: 264,
    pixelY: 238,
    epochDate: "2026-12-01",
    classification: "Brown Dwarf Candidate",
    confidence: 95,
    notes: "T1 + T6 binary brown dwarf co-moving pair verified at 11.9 light-years.",
    createdAt: "2026-11-12",
  },
  {
    id: "cand-seed-4",
    targetId: "rw-aurigae",
    targetName: "RW Aurigae",
    ra: 76.9564,
    dec: 30.4014,
    pixelX: 234,
    pixelY: 260,
    epochDate: "2026-06-01",
    classification: "Variable Source",
    confidence: 92,
    notes: "Stationary coordinates with 3.4 μm warm circumstellar dust occultation dip.",
    createdAt: "2026-11-12",
  },
];

export default function CandidatesPage() {
  const [candidates, setCandidates] =
    useState<CandidateSubmission[]>(INITIAL_CANDIDATES);
  const [filterType, setFilterType] = useState<string>("All");
  const { playSound } = useSound();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CANDIDATES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CandidateSubmission[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCandidates([...parsed, ...INITIAL_CANDIDATES]);
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const handleClearUserCandidates = () => {
    playSound("click");
    try {
      window.localStorage.removeItem(CANDIDATES_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setCandidates(INITIAL_CANDIDATES);
  };

  const visibleCandidates =
    filterType === "All"
      ? candidates
      : candidates.filter((c) => c.classification === filterType);

  return (
    <PageTransition className="space-y-12 pb-8">
      {/* Header Card */}
      <section className="glass p-8 sm:p-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-peach/15 border border-pastel-peach/35 text-pastel-peach">
            <Crosshair className="w-4 h-4" />
            Citizen Science Vetting Console
          </span>
          <SampleDataBadge source="placeholder" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
              Candidate Detections
            </h1>
            <p className="text-cosmic-muted text-base leading-relaxed">
              Review astrometric and spectrophotometric detections flagged in
              the multi-epoch blinker. Click any detection to re-verify its
              frame trajectory and 102-band infrared spectrum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/viewer?target=barnards-star"
              onClick={() => playSound("whoosh")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Flag New Candidate</span>
            </Link>

            {candidates.length > INITIAL_CANDIDATES.length && (
              <button
                type="button"
                onClick={handleClearUserCandidates}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-cosmic-muted hover:text-cosmic-text border border-white/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Local Log</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Classification Filter Pills */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {[
            "All",
            "High Proper Motion",
            "Brown Dwarf Candidate",
            "Variable Source",
          ].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                playSound("click");
                setFilterType(label);
              }}
              className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                filterType === label
                  ? "bg-pastel-peach/25 border border-pastel-peach text-cosmic-text"
                  : "glass text-cosmic-muted hover:text-cosmic-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Candidate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCandidates.map((item) => (
            <div
              key={item.id}
              className="glass p-6 sm:p-7 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.07] border border-white/15 text-pastel-sky">
                    <Sparkles className="w-3.5 h-3.5 text-pastel-lavender" />
                    {item.classification}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-pastel-mint">
                      {item.confidence}% Confidence
                    </span>
                    <SampleDataBadge source="placeholder" />
                  </div>
                </div>

                <div>
                  <h2 className="font-heading text-2xl font-bold text-cosmic-text">
                    {item.targetName}
                  </h2>
                  <p className="text-xs font-mono text-cosmic-muted mt-0.5">
                    RA {item.ra.toFixed(4)}° · Dec{" "}
                    {item.dec >= 0 ? "+" : ""}
                    {item.dec.toFixed(4)}° · Reticle ({item.pixelX},{" "}
                    {item.pixelY} px)
                  </p>
                </div>

                <p className="text-sm text-cosmic-muted leading-relaxed">
                  {item.notes}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                <span className="font-mono text-cosmic-muted">
                  Epoch: {item.epochDate} · Logged: {item.createdAt}
                </span>

                <Link
                  href={`/viewer?target=${item.targetId}&ra=${item.ra}&dec=${item.dec}`}
                  onClick={() => playSound("whoosh")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text transition-colors"
                >
                  <span>Verify in Viewer</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}

