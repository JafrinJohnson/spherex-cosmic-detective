"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Compass,
  Play,
  Layers,
  Activity,
  Sparkles,
  ArrowUpRight,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { getTargets, getFrames } from "@/lib/api";
import type { Target, TargetMeta } from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const CelestialGlobe3D = dynamic(
  () => import("@/components/CelestialGlobe3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[360px] sm:h-[420px] rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center gap-3">
        <Radar className="w-7 h-7 text-pastel-lavender animate-spin" />
        <span className="text-xs font-mono uppercase tracking-widest text-cosmic-muted">
          Initializing 3D Celestial Sphere...
        </span>
      </div>
    ),
  }
);

export default function HomePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [meta, setMeta] = useState<TargetMeta | null>(null);
  const { playSound } = useSound();

  useEffect(() => {
    let active = true;
    getTargets().then((list) => {
      if (!active) return;
      setTargets(list);
      const first = list[0] ?? null;
      setSelectedTarget(first);
      if (first) {
        getFrames(first.id).then((m) => {
          if (active) setMeta(m);
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleSelectTarget = (target: Target) => {
    playSound("click");
    setSelectedTarget(target);
    getFrames(target.id).then(setMeta);
  };

  return (
    <PageTransition className="space-y-16 pb-8">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-white/[0.07] border border-white/15 text-pastel-lavender">
              <Sparkles className="w-3.5 h-3.5 text-pastel-peach" />
              NASA SPHEREx All-Sky Time-Domain Explorer
            </span>
            <SampleDataBadge source={meta?.source ?? "placeholder"} />
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl font-bold leading-[1.08] tracking-tight text-gradient-headline">
            Spot Hidden Worlds Moving Through the Infrared Sky.
          </h1>

          <p className="text-base sm:text-lg text-cosmic-muted leading-relaxed max-w-2xl">
            Flip through multi-epoch infrared frames captured across 102
            spectral channels from 0.75 to 5.0 microns. Uncover fast-moving
            nearby brown dwarfs, runaway red dwarfs, and dust-shrouded variable
            stars invisible to optical telescopes.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href={
                selectedTarget
                  ? `/viewer?target=${selectedTarget.id}&ra=${selectedTarget.ra}&dec=${selectedTarget.dec}`
                  : "/viewer?target=barnards-star"
              }
              onClick={() => playSound("whoosh")}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-heading font-semibold text-sm tracking-wide bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Launch Multi-Epoch Blinker</span>
            </Link>

            <Link
              href="/explore"
              onClick={() => playSound("click")}
              className="glass px-6 py-3.5 rounded-full font-heading font-medium text-sm text-cosmic-text flex items-center gap-2 hover:border-pastel-sky/50"
            >
              <Compass className="w-4 h-4 text-pastel-sky" />
              <span>Explore Target Catalog</span>
            </Link>
          </div>

          {/* Telemetry Metrics Strip */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="glass p-4 rounded-2xl">
              <div className="text-xs uppercase tracking-wider text-cosmic-muted">
                Spectral Range
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text mt-1">
                0.75 – 5.0 μm
              </div>
              <div className="text-[11px] text-pastel-mint mt-0.5">
                102 Spectrophotometric Bands
              </div>
            </div>
            <div className="glass p-4 rounded-2xl">
              <div className="text-xs uppercase tracking-wider text-cosmic-muted">
                Angular Scale
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text mt-1">
                6.2&Prime; / px
              </div>
              <div className="text-[11px] text-pastel-sky mt-0.5">
                Wide-Field All-Sky Cadence
              </div>
            </div>
            <div className="glass p-4 rounded-2xl">
              <div className="text-xs uppercase tracking-wider text-cosmic-muted">
                Survey Epochs
              </div>
              <div className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text mt-1">
                4 All-Sky Passes
              </div>
              <div className="text-[11px] text-pastel-peach mt-0.5">
                6-Month Proper Motion Baseline
              </div>
            </div>
          </div>
        </div>

        {/* Interactive 3D Sky Sphere Card */}
        <div className="lg:col-span-5 glass p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold text-cosmic-text">
                Interactive 3D Celestial Sphere
              </h2>
              <p className="text-xs text-cosmic-muted">
                Select a calibrated target node to inspect its coordinates
              </p>
            </div>
            <SampleDataBadge source={meta?.source ?? "placeholder"} />
          </div>

          <CelestialGlobe3D
            targets={targets}
            selectedId={selectedTarget?.id}
            onSelectTarget={handleSelectTarget}
          />

          {selectedTarget && (
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedTarget.colors[0] }}
                  />
                  <span className="font-heading font-semibold text-sm text-cosmic-text">
                    {selectedTarget.name}
                  </span>
                  <span className="text-xs text-cosmic-muted">
                    — {selectedTarget.nickname}
                  </span>
                </div>
                <p className="text-xs text-cosmic-muted">
                  {selectedTarget.story}
                </p>
                <div className="text-[11px] font-mono text-pastel-sky">
                  RA {selectedTarget.ra.toFixed(4)}° · Dec{" "}
                  {selectedTarget.dec >= 0 ? "+" : ""}
                  {selectedTarget.dec.toFixed(4)}° ·{" "}
                  {selectedTarget.distanceLy
                    ? `${selectedTarget.distanceLy} ly`
                    : "Galactic Variable"}
                </div>
              </div>

              <Link
                href={`/viewer?target=${selectedTarget.id}&ra=${selectedTarget.ra}&dec=${selectedTarget.dec}`}
                onClick={() => playSound("whoosh")}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text border border-white/20 transition-colors"
              >
                <span>Inspect</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Priority Targets Strip */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-pastel-lavender">
              Calibrated Reference Objects
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text mt-1">
              Priority Infrared Targets
            </h2>
          </div>
          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-pastel-sky hover:underline"
          >
            <span>Open Full Coordinate Search</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targets.map((target) => (
            <div
              key={target.id}
              className="glass p-6 flex flex-col justify-between gap-5 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.07] border border-white/15 text-cosmic-text">
                    {target.type}
                  </span>
                  <SampleDataBadge source="placeholder" />
                </div>

                <div>
                  <h3 className="font-heading text-xl font-bold text-cosmic-text group-hover:text-pastel-peach transition-colors">
                    {target.name}
                  </h3>
                  <p className="text-xs font-medium text-pastel-lavender">
                    {target.nickname}
                  </p>
                </div>

                <p className="text-sm text-cosmic-muted leading-relaxed">
                  {target.story}
                </p>
              </div>

              <div className="space-y-4 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-mono text-cosmic-muted">
                  <span>
                    RA {target.ra.toFixed(2)}° / Dec {target.dec.toFixed(2)}°
                  </span>
                  <span>
                    {target.distanceLy !== null
                      ? `${target.distanceLy} ly`
                      : "Variable Flux"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {target.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider bg-white/[0.06] text-cosmic-muted border border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/viewer?target=${target.id}&ra=${target.ra}&dec=${target.dec}`}
                    onClick={() => playSound("whoosh")}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text transition-colors"
                  >
                    <span>Blink</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Detective Workflow Section */}
      <section className="glass p-8 sm:p-10">
        <div className="max-w-2xl mb-8">
          <span className="text-xs font-mono uppercase tracking-widest text-pastel-mint">
            Detection Protocol
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text mt-1">
            How Cosmic Detective Works
          </h2>
          <p className="text-sm text-cosmic-muted mt-2">
            Combine multi-epoch frame blinking with SPHEREx low-resolution
            infrared spectroscopy to verify genuine solar-neighborhood objects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pastel-lavender/15 border border-pastel-lavender/35 flex items-center justify-center text-pastel-lavender">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-cosmic-text">
              1. Blink Multi-Epoch Frames
            </h3>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Step through four 6-month survey epochs (`2025-06` through
              `2026-12`). Background stars stay locked while nearby high-proper-motion
              sources shift across pixels.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pastel-peach/15 border border-pastel-peach/35 flex items-center justify-center text-pastel-peach">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-cosmic-text">
              2. Inspect 102-Band Spectra
            </h3>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Analyze the 0.75–5.0 μm spectral profile to identify deep methane
              (CH₄) and water (H₂O) absorption troughs typical of ultracool T and
              Y brown dwarfs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pastel-mint/15 border border-pastel-mint/35 flex items-center justify-center text-pastel-mint">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-heading text-lg font-semibold text-cosmic-text">
              3. Log &amp; Vet Candidates
            </h3>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Mark moving sources directly on the sky frame, record astrometric
              offsets, and submit your candidate to the local citizen-science
              vetting catalog.
            </p>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}

