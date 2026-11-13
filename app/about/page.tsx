"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Telescope,
  Database,
  Scissors,
  Layers,
  Search,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Users,
  Code2,
  Sparkles,
} from "lucide-react";
import { getTargets } from "@/lib/api";
import { formatRA, formatDec } from "@/lib/coords";
import type { Target } from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { useSound } from "@/components/SoundProvider";

const TIMELINE_STEPS = [
  {
    step: "01",
    title: "NASA IRSA archive",
    description:
      "Calibrated SPHEREx spectral images from multiple six-month all-sky passes are hosted publicly at the NASA/IPAC Infrared Science Archive.",
    icon: Database,
    accent: "#C3B1E1",
  },
  {
    step: "02",
    title: "Cut out your patch of sky",
    description:
      "Select a famous mover or enter any Right Ascension and Declination to extract matching multi-epoch infrared cutouts across 0.75 to 5.0 microns.",
    icon: Scissors,
    accent: "#A2D2FF",
  },
  {
    step: "03",
    title: "Align & blink",
    description:
      "Frames from each telescope visit are aligned to the same celestial grid and flipped in rapid sequence—or subtracted in Difference and Trail modes.",
    icon: Layers,
    accent: "#B5EAD7",
  },
  {
    step: "04",
    title: "You investigate",
    description:
      "Click any dot to measure its centroid displacement, proper motion speed, and 102-channel infrared spectrum, then log promising leads to the Candidates Board.",
    icon: Search,
    accent: "#FFB5A7",
  },
];

export default function AboutPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [activePhoto, setActivePhoto] = useState<"A" | "B">("A");
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  useEffect(() => {
    let active = true;
    getTargets().then((list) => {
      if (active) setTargets(list);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const intervalMs = prefersReducedMotion ? 1600 : 850;
    const timer = window.setInterval(() => {
      setActivePhoto((prev) => (prev === "A" ? "B" : "A"));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion]);

  return (
    <PageTransition className="max-w-[1080px] mx-auto space-y-12 pb-20">
      {/* 1. HERO */}
      <section className="glass p-8 sm:p-12 space-y-5 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-lavender/15 border border-pastel-lavender/35 text-pastel-lavender">
          <Telescope className="w-3.5 h-3.5" />
          <span>Mission Story &amp; Science</span>
        </div>

        <div className="space-y-3 max-w-3xl">
          <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-gradient-headline">
            About Cosmic Detective
          </h1>
          <p className="text-lg sm:text-xl text-cosmic-text font-medium leading-relaxed">
            Empowering anyone to explore NASA SPHEREx time-series infrared sky
            images and spot faint worlds that move across the dark.
          </p>
        </div>
      </section>

      {/* 2. WHAT IS SPHEREx? */}
      <section className="glass p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <span className="text-xs font-mono uppercase tracking-widest text-pastel-peach">
            01 · The Space Telescope
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold text-cosmic-text">
            What is SPHEREx?
          </h2>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Launched in 2025, NASA&apos;s{" "}
            <strong className="text-cosmic-text">SPHEREx</strong>{" "}
            (Spectro-Photometer for the History of the Universe, Epoch of
            Reionization and Ices Explorer) maps the{" "}
            <strong className="text-cosmic-text">
              whole sky every six months in 102 infrared colours
            </strong>
            , capturing calibrated spectral images of{" "}
            <strong className="text-cosmic-text">
              more than a billion objects
            </strong>
            .
          </p>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Instead of heavy mechanical gratings, SPHEREx uses Linear Variable
            Filters (LVFs) across six spectrophotometric bands (0.75 to 5.0
            microns). Because cool brown dwarfs, distant solar system bodies,
            and dusty variable stars glow brightly in the infrared while staying
            nearly invisible to optical telescopes, SPHEREx&apos;s repeated
            six-month sky surveys create a treasure map for objects that shift or
            flicker over time.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/[0.06] border border-white/15 text-pastel-lavender">
              Launched 2025
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/[0.06] border border-white/15 text-pastel-peach">
              102 Infrared Colours
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/[0.06] border border-white/15 text-pastel-mint">
              All-Sky Every 6 Months
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs font-mono bg-white/[0.06] border border-white/15 text-pastel-sky">
              1 Billion+ Objects
            </span>
          </div>
        </div>

        {/* Small Rotating CSS Sphere Decoration */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-full relative overflow-hidden shadow-[0_0_55px_rgba(195,177,225,0.4)] border border-white/20"
              style={{
                background:
                  "radial-gradient(circle at 30% 28%, #FFB5A7 0%, #C3B1E1 45%, #4B3A8C 82%, #0B0B1E 100%)",
              }}
            >
              <div className="css-sphere-highlight" />
            </div>
            <div
              className="pointer-events-none absolute w-44 h-14 rounded-full border-2 border-[#FFB5A7]/45 rotate-[-20deg]"
              aria-hidden="true"
            />
          </div>
          <span className="mt-2 text-xs font-mono text-cosmic-muted">
            0.75 – 5.0 µm Spectral Survey
          </span>
        </div>
      </section>

      {/* 3. HOW MOTION REVEALS HIDDEN WORLDS */}
      <section className="glass p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs font-mono uppercase tracking-widest text-pastel-mint">
            02 · The Blink Comparator
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold text-cosmic-text">
            How motion reveals hidden worlds
          </h2>
          <p className="text-cosmic-muted text-base leading-relaxed">
            In <strong className="text-cosmic-text">1930</strong>, young
            astronomer{" "}
            <strong className="text-cosmic-text">Clyde Tombaugh</strong>{" "}
            discovered Pluto at Lowell Observatory by{" "}
            <strong className="text-cosmic-text">comparing two photos</strong>{" "}
            of the same patch of sky taken days apart inside a mechanical blink
            comparator. While thousands of distant background stars stayed locked
            in place, one tiny point of light hopped noticeably from frame to
            frame.
          </p>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Nearly a century later, citizen science volunteers around the world
            have found{" "}
            <strong className="text-cosmic-text">
              many comets and cold brown dwarfs
            </strong>{" "}
            the exact same way—inspecting time-lapse infrared images where
            automated pipelines can be fooled by diffraction spikes, cosmic rays,
            or crowded star fields.
          </p>
        </div>

        {/* Visual: Two Small Side-by-Side "Photo" Boxes with an Animated Blinking Dot */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          {/* Photo A Box */}
          <div
            className={`rounded-2xl p-4 bg-[#07061A] border transition-all ${
              activePhoto === "A"
                ? "border-pastel-mint shadow-[0_0_24px_rgba(181,234,215,0.28)]"
                : "border-white/15 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-3">
              <span className="text-cosmic-text font-semibold">
                Photo A · Visit 1
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activePhoto === "A"
                    ? "bg-pastel-mint/20 text-pastel-mint"
                    : "bg-white/5 text-cosmic-muted"
                }`}
              >
                {activePhoto === "A" ? "ACTIVE" : "IDLE"}
              </span>
            </div>
            <svg
              viewBox="0 0 180 140"
              className="w-full h-36 rounded-xl bg-[#0B0B1E] border border-white/10"
              aria-label="Photo A showing stationary background stars and a moving object at its first position"
            >
              {/* Fixed background stars */}
              <circle cx="34" cy="30" r="2" fill="#EDEBFF" opacity="0.85" />
              <circle cx="140" cy="28" r="1.8" fill="#CFCBEA" opacity="0.75" />
              <circle cx="122" cy="108" r="2.2" fill="#A2D2FF" opacity="0.8" />
              <circle cx="44" cy="104" r="1.6" fill="#CFCBEA" opacity="0.7" />
              <circle cx="88" cy="64" r="1.5" fill="#EDEBFF" opacity="0.6" />

              {/* Mover position in Photo A */}
              <circle
                cx="66"
                cy="82"
                r={activePhoto === "A" ? "5" : "3.5"}
                fill="#FFB5A7"
                opacity={activePhoto === "A" ? "1" : "0.45"}
              />
              {activePhoto === "A" && (
                <circle
                  cx="66"
                  cy="82"
                  r="10"
                  fill="none"
                  stroke="#FFB5A7"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              )}
            </svg>
          </div>

          {/* Photo B Box */}
          <div
            className={`rounded-2xl p-4 bg-[#07061A] border transition-all ${
              activePhoto === "B"
                ? "border-pastel-peach shadow-[0_0_24px_rgba(255,181,167,0.28)]"
                : "border-white/15 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono mb-3">
              <span className="text-cosmic-text font-semibold">
                Photo B · Visit 2
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activePhoto === "B"
                    ? "bg-pastel-peach/20 text-pastel-peach"
                    : "bg-white/5 text-cosmic-muted"
                }`}
              >
                {activePhoto === "B" ? "ACTIVE" : "IDLE"}
              </span>
            </div>
            <svg
              viewBox="0 0 180 140"
              className="w-full h-36 rounded-xl bg-[#0B0B1E] border border-white/10"
              aria-label="Photo B showing the same stationary background stars while the moving object shifts up and right"
            >
              {/* Fixed background stars (identical coordinates) */}
              <circle cx="34" cy="30" r="2" fill="#EDEBFF" opacity="0.85" />
              <circle cx="140" cy="28" r="1.8" fill="#CFCBEA" opacity="0.75" />
              <circle cx="122" cy="108" r="2.2" fill="#A2D2FF" opacity="0.8" />
              <circle cx="44" cy="104" r="1.6" fill="#CFCBEA" opacity="0.7" />
              <circle cx="88" cy="64" r="1.5" fill="#EDEBFF" opacity="0.6" />

              {/* Faint ghost of Photo A position */}
              <circle cx="66" cy="82" r="2.5" fill="#FFB5A7" opacity="0.25" />
              <line
                x1="66"
                y1="82"
                x2="108"
                y2="46"
                stroke="#FFD166"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.6"
              />

              {/* Mover position in Photo B */}
              <circle
                cx="108"
                cy="46"
                r={activePhoto === "B" ? "5" : "3.5"}
                fill="#FFB5A7"
                opacity={activePhoto === "B" ? "1" : "0.45"}
              />
              {activePhoto === "B" && (
                <circle
                  cx="108"
                  cy="46"
                  r="10"
                  fill="none"
                  stroke="#FFB5A7"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              )}
            </svg>
          </div>
        </div>
      </section>

      {/* 4. HOW THIS TOOL WORKS (Vertical Glass Timeline) */}
      <section className="glass p-8 sm:p-10 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-pastel-sky">
            03 · Pipeline Architecture
          </span>
          <h2 className="font-heading text-2xl sm:text-4xl font-bold text-cosmic-text">
            How this tool works
          </h2>
          <p className="text-cosmic-muted text-sm sm:text-base">
            From raw spacecraft telemetry to your browser canvas in four steps:
          </p>
        </div>

        <div className="relative pl-6 sm:pl-8 border-l-2 border-white/15 space-y-6">
          {TIMELINE_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                className="relative glass p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Timeline node dot */}
                <span
                  className="absolute -left-[33px] sm:-left-[41px] top-6 w-4 h-4 rounded-full border-2 border-[#0B0B1E]"
                  style={{ backgroundColor: item.accent }}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-4">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/15 bg-white/[0.06]"
                    style={{ color: item.accent }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cosmic-muted">
                        STEP {item.step}
                      </span>
                      <h3 className="font-heading text-lg sm:text-xl font-bold text-cosmic-text">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-cosmic-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* 5. THE 5 TEST OBJECTS */}
      <section className="glass p-8 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-pastel-lavender">
              04 · Calibration Benchmark Catalog
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
              The 5 test objects
            </h2>
            <p className="text-sm text-cosmic-muted">
              Curated real astronomical objects pre-loaded for instant offline
              and online investigation.
            </p>
          </div>
          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
          >
            <span>Open 3D Sky Globe</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/10 border border-white/15 rounded-2xl overflow-hidden bg-white/[0.03]">
          {targets.map((t) => (
            <div
              key={t.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span
                  className="w-8 h-8 rounded-full shrink-0 border border-white/20"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${
                      t.colors?.[0] || "#FFB5A7"
                    }, ${t.colors?.[1] || "#4B3A8C"})`,
                  }}
                  aria-hidden="true"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-cosmic-text">
                      {t.name}
                    </h3>
                    <span className="text-xs text-pastel-peach font-medium">
                      · {t.nickname}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/[0.07] border border-white/10 text-cosmic-muted">
                      {t.type}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-cosmic-muted mt-0.5">
                    {formatRA(t.ra)} · {formatDec(t.dec)}
                  </p>
                </div>
              </div>

              <Link
                href={`/viewer?target=${t.id}`}
                onClick={() => playSound("whoosh")}
                className="min-h-[44px] self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white/[0.09] hover:bg-white/[0.18] text-cosmic-text border border-white/15 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
              >
                <span>Investigate</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 6. DATA & CREDITS + 7. TEAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Data & Credits */}
        <section className="lg:col-span-7 glass p-7 sm:p-8 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-pastel-mint">
              <ShieldCheck className="w-4 h-4" />
              <span>Data &amp; Credits</span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-cosmic-text">
              Open Space Archives
            </h2>
            <p className="text-sm text-cosmic-text font-medium leading-relaxed">
              SPHEREx data: NASA / JPL-Caltech / IPAC, via the NASA/IPAC
              Infrared Science Archive (IRSA).
            </p>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Astrometric cross-matching and stellar distances draw on{" "}
              <strong className="text-cosmic-text">Gaia (ESA)</strong>{" "}
              catalogues, and all-sky mid-infrared reference discoveries build on{" "}
              <strong className="text-cosmic-text">WISE / NEOWISE (NASA)</strong>
              .
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-cosmic-muted leading-relaxed">
            <strong className="text-pastel-peach">Scientific Note:</strong> We
            do not claim discoveries; candidates are leads for experts to check.
          </div>
        </section>

        {/* Team Card */}
        <section className="lg:col-span-5 glass p-7 sm:p-8 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-pastel-pink">
              <Users className="w-4 h-4" />
              <span>Project Team</span>
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text">
              Built for NASA Space Apps Challenge 2026 · Challenge: Planet X and
              SPHEREx
            </h2>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Designed to make multi-epoch infrared spectrophotometry accessible
              to students, amateur astronomers, and citizen detectives.
            </p>

            <div className="pt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-medium text-cosmic-text">
                <Sparkles className="w-3.5 h-3.5 text-pastel-lavender" />
                <span>[Member 1]</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-medium text-cosmic-text">
                <Sparkles className="w-3.5 h-3.5 text-pastel-peach" />
                <span>[Member 2]</span>
              </span>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="https://github.com/placeholder/spherex-cosmic-detective"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
            >
              <Code2 className="w-4 h-4 text-pastel-sky" />
              <span>GitHub Repository (Placeholder)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
