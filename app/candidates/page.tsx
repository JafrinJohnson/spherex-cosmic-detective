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
import type { CandidateRecord } from "@/types";
import { getCandidates, removeCandidate } from "@/lib/candidates";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const SEED_CANDIDATES: CandidateRecord[] = [
  {
    id: "cand-seed-1",
    ra: 269.4521,
    dec: 4.6934,
    target: "Barnard's Star",
    targetId: "barnards-star",
    verdict: "Mover",
    displacementArcsec: 58.9,
    speed: 0.1075,
    direction: "up and to the right",
    note: "Fast linear trajectory across all 4 SPHEREx visits; M-dwarf 1.35 µm continuum peak.",
    createdAt: "2026-11-10T10:00:00Z",
    thumbnail: "",
  },
  {
    id: "cand-seed-2",
    ra: 133.7951,
    dec: -7.2451,
    target: "WISE 0855−0714",
    targetId: "wise-0855",
    verdict: "Mover",
    displacementArcsec: 58.3,
    speed: 0.1064,
    direction: "up and to the right",
    note: "Coldest known brown dwarf with deep methane (3.3 µm) and water (3.0 µm) absorption troughs.",
    createdAt: "2026-11-11T14:30:00Z",
    thumbnail: "",
  },
  {
    id: "cand-seed-3",
    ra: 76.9564,
    dec: 30.4014,
    target: "RW Aurigae",
    targetId: "rw-aurigae",
    verdict: "Changing brightness",
    displacementArcsec: 0.2,
    speed: 0.0004,
    direction: "stationary",
    note: "Stationary young variable star with strong brightness change across visits.",
    createdAt: "2026-11-12T09:15:00Z",
    thumbnail: "",
  },
];

export default function CandidatesPage() {
  const [userCandidates, setUserCandidates] = useState<CandidateRecord[]>([]);
  const [filterVerdict, setFilterVerdict] = useState<string>("All");
  const { playSound } = useSound();

  useEffect(() => {
    setUserCandidates(getCandidates());
  }, []);

  const allCandidates = [...userCandidates, ...SEED_CANDIDATES];
  const visibleCandidates =
    filterVerdict === "All"
      ? allCandidates
      : allCandidates.filter((c) => c.verdict === filterVerdict);

  const handleDeleteCandidate = (id: string) => {
    playSound("click");
    const updated = removeCandidate(id);
    setUserCandidates(updated);
  };

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-12 pb-16">
      {/* Header Card */}
      <section className="glass p-8 sm:p-10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-peach/15 border border-pastel-peach/35 text-pastel-peach">
            <Crosshair className="w-4 h-4" />
            <span>Candidates Board</span>
          </span>
          <SampleDataBadge source="placeholder" />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
              Candidate Detections
            </h1>
            <p className="text-cosmic-muted text-base leading-relaxed">
              Review objects investigated and marked in the Detective Viewer.
              Click any candidate to re-inspect its multi-epoch blink sequence
              and 102-channel infrared spectrum.
            </p>
          </div>

          <Link
            href="/viewer?target=barnards-star"
            onClick={() => playSound("whoosh")}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Investigate Sky</span>
          </Link>
        </div>
      </section>

      {/* Verdict Filter Pills */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Mover", "Changing brightness", "Still star"].map(
            (label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  playSound("click");
                  setFilterVerdict(label);
                }}
                className={`min-h-[40px] px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  filterVerdict === label
                    ? "bg-pastel-peach/25 border border-pastel-peach text-cosmic-text"
                    : "glass text-cosmic-muted hover:text-cosmic-text"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* Candidate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleCandidates.map((item) => {
            const isUserAdded = !item.id.startsWith("cand-seed-");
            return (
              <div
                key={item.id}
                className="glass p-6 sm:p-7 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.08] border border-white/15 text-pastel-peach">
                      <Sparkles className="w-3.5 h-3.5 text-pastel-lavender" />
                      <span>{item.verdict}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <SampleDataBadge source="placeholder" />
                      {isUserAdded && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCandidate(item.id)}
                          aria-label="Remove candidate"
                          className="p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-cosmic-muted hover:text-pastel-peach transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="font-heading text-2xl font-bold text-cosmic-text">
                        {item.target}
                      </h2>
                      <p className="text-xs font-mono text-pastel-sky">
                        RA {item.ra.toFixed(4)}° · Dec{" "}
                        {item.dec >= 0 ? "+" : ""}
                        {item.dec.toFixed(4)}°
                      </p>
                      <p className="text-xs font-mono text-cosmic-muted">
                        Moved {item.displacementArcsec}″ ({item.speed}″/day ·{" "}
                        {item.direction})
                      </p>
                    </div>

                    {item.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnail}
                        alt={`Thumbnail for ${item.target}`}
                        className="w-16 h-16 rounded-xl border border-white/20 object-cover shrink-0 bg-[#0B0B1E]"
                      />
                    )}
                  </div>

                  {item.note && (
                    <p className="text-sm text-cosmic-muted leading-relaxed">
                      {item.note}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                  <span className="font-mono text-cosmic-muted">
                    Logged: {item.createdAt.slice(0, 10)}
                  </span>

                  <Link
                    href={
                      item.targetId
                        ? `/viewer?target=${item.targetId}&ra=${item.ra}&dec=${item.dec}`
                        : `/viewer?ra=${item.ra}&dec=${item.dec}`
                    }
                    onClick={() => playSound("whoosh")}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text transition-colors"
                  >
                    <span>Verify in Viewer</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </PageTransition>
  );
}
