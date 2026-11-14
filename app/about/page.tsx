"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Database,
  Scissors,
  Layers,
  Search,
  ArrowUpRight,
  ExternalLink,
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
    step: "1",
    title: "IRSA archive",
    description:
      "Calibrated spectral images from six-month all-sky passes are hosted publicly at the Infrared Science Archive.",
    icon: Database,
    accent: "#C3B1E1",
  },
  {
    step: "2",
    title: "Cut out your patch of sky",
    description:
      "Select a famous mover or enter any Right Ascension and Declination to extract multi-epoch infrared cutouts across 0.75 to 5.0 microns.",
    icon: Scissors,
    accent: "#A2D2FF",
  },
  {
    step: "3",
    title: "Align & blink",
    description:
      "Frames from each telescope visit are aligned to the same celestial grid and flipped in rapid sequence, or subtracted in Difference and Trail modes.",
    icon: Layers,
    accent: "#B5EAD7",
  },
  {
    step: "4",
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
      <section className="glass p-8 sm:p-12 space-y-4 relative overflow-hidden">
        <div className="space-y-3 max-w-3xl">
          <h1 className="font-heading text-3xl sm:text-5xl font-medium text-cosmic-text">
            About Cosmic Detective
          </h1>
          <p className="text-lg sm:text-xl text-cosmic-muted leading-relaxed">
            Explore time-series infrared sky images and spot faint worlds that
            move across the dark.
          </p>
        </div>
      </section>

      {/* 2. WHAT IS SPHEREx? */}
      <section className="glass p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-heading text-2xl sm:text-4xl font-medium text-cosmic-text">
            What is SPHEREx?
          </h2>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Launched in 2025, the{" "}
            <strong className="text-cosmic-text font-medium">SPHEREx</strong>{" "}
            observatory (Spectro-Photometer for the History of the Universe,
            Epoch of Reionization and Ices Explorer) maps the{" "}
            <strong className="text-cosmic-text font-medium">
              whole sky every six months in 102 infrared colours
            </strong>
            , capturing calibrated spectral images of{" "}
            <strong className="text-cosmic-text font-medium">
              more than a billion objects
            </strong>
            .
          </p>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Using Linear Variable Filters across six spectrophotometric bands
            (0.75 to 5.0 microns), repeated six-month surveys reveal cool brown
            dwarfs, distant solar system bodies, and dusty variable stars that
            shift or vary over time.
          </p>

          {/* Max 2 chips per card */}
          <div className="pt-2 flex flex-wrap gap-3">
            <span className="px-3.5 py-1.5 rounded-full text-xs bg-white/[0.06] border border-white/15 text-pastel-peach">
              102 infrared bands
            </span>
            <span className="px-3.5 py-1.5 rounded-full text-xs bg-white/[0.06] border border-white/15 text-pastel-mint">
              All-sky every 6 months
            </span>
          </div>
        </div>

        {/* Small Rotating CSS Sphere Decoration */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-full relative overflow-hidden shadow-[0_0_55px_rgba(195,177,225,0.3)] border border-white/20"
              style={{
                background:
                  "radial-gradient(circle at 30% 28%, #FFB5A7 0%, #C3B1E1 45%, #4B3A8C 82%, #07090F 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute w-44 h-14 rounded-full border-2 border-[#FFB5A7]/45 rotate-[-20deg]"
              aria-hidden="true"
            />
          </div>
          <span className="mt-2 text-xs font-mono text-cosmic-muted">
            0.75 to 5.0 µm spectral survey
          </span>
        </div>
      </section>

      {/* 3. HOW MOTION REVEALS HIDDEN WORLDS */}
      <section className="glass p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <h2 className="font-heading text-2xl sm:text-4xl font-medium text-cosmic-text">
            How motion reveals hidden worlds
          </h2>
          <p className="text-cosmic-muted text-base leading-relaxed">
            In <strong className="text-cosmic-text font-medium">1930</strong>,
            astronomer{" "}
            <strong className="text-cosmic-text font-medium">
              Clyde Tombaugh
            </strong>{" "}
            discovered Pluto at Lowell Observatory by{" "}
            <strong className="text-cosmic-text font-medium">
              comparing two photos
            </strong>{" "}
            of the same patch of sky taken days apart inside a blink comparator.
            While thousands of distant background stars stayed locked in place,
            one tiny point of light hopped noticeably from frame to frame.
          </p>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Nearly a century later, volunteers around the world have found{" "}
            <strong className="text-cosmic-text font-medium">
              many comets and cold brown dwarfs
            </strong>{" "}
            the same way, inspecting time-lapse infrared images where automated
            pipelines can be fooled by diffraction spikes or crowded star
            fields.
          </p>
        </div>

        {/* Visual: Two Small Side-by-Side "Photo" Boxes with an Animated Blinking Dot */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          {/* Photo A Box */}
          <div
            className={`rounded-2xl p-4 bg-[#07090F] border transition-all ${
              activePhoto === "A"
                ? "border-pastel-mint shadow-[0_0_24px_rgba(181,234,215,0.22)]"
                : "border-white/15 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-cosmic-text font-medium">
                Photo A · Visit 1
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] ${
                  activePhoto === "A"
                    ? "bg-pastel-mint/20 text-pastel-mint"
                    : "bg-white/5 text-cosmic-muted"
                }`}
              >
                {activePhoto === "A" ? "Active" : "Idle"}
              </span>
            </div>
            <svg
              viewBox="0 0 180 140"
              className="w-full h-36 rounded-xl bg-[#07090F] border border-white/10"
              aria-label="Photo A showing stationary background stars and a moving object at its first position"
            >
              <circle cx="34" cy="30" r="2" fill="#EDEBFF" opacity="0.85" />
              <circle cx="140" cy="28" r="1.8" fill="#CFCBEA" opacity="0.75" />
              <circle cx="122" cy="108" r="2.2" fill="#A2D2FF" opacity="0.8" />
              <circle cx="44" cy="104" r="1.6" fill="#CFCBEA" opacity="0.7" />
              <circle cx="88" cy="64" r="1.5" fill="#EDEBFF" opacity="0.6" />

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
            className={`rounded-2xl p-4 bg-[#07090F] border transition-all ${
              activePhoto === "B"
                ? "border-pastel-peach shadow-[0_0_24px_rgba(255,181,167,0.22)]"
                : "border-white/15 opacity-75"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="text-cosmic-text font-medium">
                Photo B · Visit 2
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] ${
                  activePhoto === "B"
                    ? "bg-pastel-peach/20 text-pastel-peach"
                    : "bg-white/5 text-cosmic-muted"
                }`}
              >
                {activePhoto === "B" ? "Active" : "Idle"}
              </span>
            </div>
            <svg
              viewBox="0 0 180 140"
              className="w-full h-36 rounded-xl bg-[#07090F] border border-white/10"
              aria-label="Photo B showing the same stationary background stars while the moving object shifts up and right"
            >
              <circle cx="34" cy="30" r="2" fill="#EDEBFF" opacity="0.85" />
              <circle cx="140" cy="28" r="1.8" fill="#CFCBEA" opacity="0.75" />
              <circle cx="122" cy="108" r="2.2" fill="#A2D2FF" opacity="0.8" />
              <circle cx="44" cy="104" r="1.6" fill="#CFCBEA" opacity="0.7" />
              <circle cx="88" cy="64" r="1.5" fill="#EDEBFF" opacity="0.6" />

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

      {/* 4. HOW THIS TOOL WORKS */}
      <section className="glass p-8 sm:p-10 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <h2 className="font-heading text-2xl sm:text-4xl font-medium text-cosmic-text">
            How this tool works
          </h2>
          <p className="text-cosmic-muted text-sm sm:text-base">
            From raw spacecraft telemetry to your browser canvas in four steps.
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
                <span
                  className="absolute -left-[33px] sm:-left-[41px] top-6 w-4 h-4 rounded-full border-2 border-[#07090F]"
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
                    <h3 className="font-heading text-lg sm:text-xl font-medium text-cosmic-text">
                      {item.step}. {item.title}
                    </h3>
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
            <h2 className="font-heading text-2xl sm:text-3xl font-medium text-cosmic-text">
              The 5 test objects
            </h2>
            <p className="text-sm text-cosmic-muted">
              Curated astronomical objects pre-loaded for immediate
              investigation.
            </p>
          </div>
          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
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
                    <h3 className="font-heading font-medium text-base text-cosmic-text">
                      {t.name}
                    </h3>
                    <span className="text-xs text-pastel-peach">
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
                className="min-h-[44px] self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-white/[0.09] hover:bg-white/[0.18] text-cosmic-text border border-white/15 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
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
            <h2 className="font-heading text-2xl font-medium text-cosmic-text">
              Data and credits
            </h2>
            <p className="text-sm text-cosmic-text leading-relaxed">
              SPHEREx data: NASA / JPL-Caltech / IPAC, via the NASA/IPAC
              Infrared Science Archive (IRSA).
            </p>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Astrometric cross-matching and stellar distances draw on{" "}
              <strong className="text-cosmic-text font-medium">
                Gaia (ESA)
              </strong>{" "}
              catalogues, and all-sky mid-infrared reference discoveries build on{" "}
              <strong className="text-cosmic-text font-medium">
                WISE / NEOWISE (NASA)
              </strong>
              .
            </p>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              Planet textures: Solar System Scope, CC BY 4.0.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-cosmic-muted leading-relaxed">
            <strong className="text-pastel-peach font-medium">
              Scientific note:
            </strong>{" "}
            We do not claim discoveries; candidates are leads for experts to
            check.
          </div>
        </section>

        {/* Team Card */}
        <section className="lg:col-span-5 glass p-7 sm:p-8 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="font-heading text-xl sm:text-2xl font-medium text-cosmic-text">
              Built for Space Apps Challenge 2026 · Challenge: Planet X and
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
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pastel-lavender"
            >
              <Code2 className="w-4 h-4 text-pastel-sky" />
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
