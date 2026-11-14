"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import {
  Search,
  Layers,
  Crosshair,
  ArrowRight,
  GraduationCap,
  Orbit,
} from "lucide-react";
import { getTargets } from "@/lib/api";
import type { Target } from "@/types";
import type { HeroViewMode } from "@/components/three/CinematicHero";
import { PageTransition } from "@/components/PageTransition";
import { useSound } from "@/components/SoundProvider";
import { useAuth } from "@/context/AuthProvider";
import { getFirstName } from "@/lib/auth";

const CinematicHero = dynamic(
  () => import("@/components/three/CinematicHero"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#05070c] flex items-center justify-center">
        <div
          className="w-28 h-28 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, #ffcc55 0%, #ff9d2e 45%, transparent 75%)",
          }}
        />
      </div>
    ),
  }
);

function formatTargetDistance(distanceLy: number | null): string {
  if (distanceLy === null || distanceLy === undefined) {
    return "Distance from Gaia";
  }
  const roundedInt = Math.round(distanceLy);
  if (Math.abs(distanceLy - roundedInt) < 0.06) {
    return `${roundedInt} light years away`;
  }
  return `${distanceLy} light years away`;
}

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Search the sky",
    description: "Enter coordinates or pick a famous object.",
    icon: Search,
    accent: "#A2D2FF",
  },
  {
    number: "2",
    title: "Blink the images",
    description: "Watch infrared photos from different dates play in sequence.",
    icon: Layers,
    accent: "#C3B1E1",
  },
  {
    number: "3",
    title: "Spot the mover",
    description: "Click anything that shifted and save it as a candidate.",
    icon: Crosshair,
    accent: "#FFB5A7",
  },
];

export default function HomePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [heroViewMode, setHeroViewMode] = useState<HeroViewMode>("cinematic");
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();
  const { user, isGuest } = useAuth();

  useEffect(() => {
    let active = true;
    getTargets().then((list) => {
      if (!active) return;
      setTargets(list);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-24 sm:space-y-32 pb-16">
      {/* SECTION 1: CINEMATIC HERO (Full-viewport Canvas + left text over dark gradient) */}
      <section className="relative w-screen left-1/2 -translate-x-1/2 -mt-8 min-h-[680px] h-[calc(100vh-4.5rem)] max-h-[960px] overflow-hidden border-b border-white/10">
        {/* Single persistent 3D Canvas (switches smoothly between Cinematic Hero & Full Solar System) */}
        <div className="absolute inset-0 z-0">
          <CinematicHero
            viewMode={heroViewMode}
            onViewModeChange={setHeroViewMode}
          />
        </div>

        {/* Left side dark gradient overlay behind the hero text */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 z-10 bg-gradient-to-r from-[#05070c]/95 via-[#05070c]/75 to-transparent transition-opacity duration-500 ${
            heroViewMode === "orrery" ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Hero Foreground Content */}
        <div
          className={`pointer-events-none relative z-20 max-w-7xl mx-auto h-full px-6 sm:px-10 flex items-center transition-opacity duration-500 ${
            heroViewMode === "orrery" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="max-w-2xl space-y-6 py-10">
            {user && !isGuest && (
              <p className="text-[15px] text-[#B5EAD7]">
                Welcome back, {getFirstName(user.name)}
              </p>
            )}

            <h1 className="font-heading font-bold text-[clamp(3rem,7vw,6.5rem)] leading-[1.04] tracking-[0.02em] text-cosmic-text">
              <span className="block">Become a</span>
              <span className="block text-gradient-infrared">
                Cosmic Detective
              </span>
            </h1>

            <p className="text-[20px] text-cosmic-muted leading-[1.6] max-w-[560px]">
              Compare multi-epoch infrared sky images over time and spot what
              moves, the same way Pluto was found.
            </p>

            {/* Primary & Secondary Action Buttons (17px) */}
            <div
              className={`${
                heroViewMode === "cinematic"
                  ? "pointer-events-auto"
                  : "pointer-events-none"
              } flex flex-wrap items-center gap-4 pt-1`}
            >
              <Link
                href="/explore"
                onClick={() => playSound("whoosh")}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-[17px] bg-infrared-gradient text-[#07090F] shadow-infrared-glow hover:opacity-95 transition-all"
              >
                <span>
                  {user && !isGuest && user.role === "explorer"
                    ? "Open Explorer"
                    : "Start Investigating"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/training"
                onClick={() => playSound("click")}
                className="glass inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-[17px] text-cosmic-text hover:border-pastel-lavender/60 transition-all"
              >
                <GraduationCap className="w-4 h-4 text-pastel-lavender" />
                <span>Try Training Mode</span>
              </Link>
            </div>

            {/* Maximum 2 Stat Chips (15px) + 15px Glass Hint */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {["102 infrared bands", "Whole sky every 6 months"].map(
                (stat) => (
                  <div
                    key={stat}
                    className="glass px-4 py-1.5 rounded-full text-[15px] text-cosmic-text flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
                    <span>{stat}</span>
                  </div>
                )
              )}

              <div className="glass px-4 py-1.5 rounded-full text-[15px] text-cosmic-muted">
                Drag to look around · Click a planet
              </div>
            </div>

            {/* Button under the hero chips: "View full solar system" */}
            <div
              className={
                heroViewMode === "cinematic"
                  ? "pointer-events-auto pt-1"
                  : "pointer-events-none pt-1"
              }
            >
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setHeroViewMode("orrery");
                }}
                className="glass inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-[17px] font-medium text-cosmic-text hover:bg-white/15 hover:border-pastel-sky/60 transition-all"
              >
                <Orbit className="w-4 h-4 text-pastel-sky" />
                <span>View full solar system</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-medium tracking-[0.02em] text-cosmic-text">
            How a detective works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {HOW_IT_WORKS_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={
                  prefersReducedMotion
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 24 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: 0.45,
                  delay: prefersReducedMotion ? 0 : index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="glass p-7 flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${step.accent}1A`,
                      borderColor: `${step.accent}4D`,
                      color: step.accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-2xl text-cosmic-muted/40">
                    {step.number}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-heading text-xl sm:text-2xl font-medium tracking-[0.02em] text-cosmic-text">
                    {step.title}
                  </h3>
                  <p className="text-base text-cosmic-muted leading-[1.6]">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: FEATURED OBJECTS (CSS spheres only, no WebGL canvases) */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h2 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-medium tracking-[0.02em] text-cosmic-text">
            Start with a famous mover
          </h2>

          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="inline-flex items-center gap-2 text-[17px] text-pastel-sky hover:underline"
          >
            <span>Browse all sky targets</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {targets.map((target) => {
            const c1 = target.colors?.[0] ?? "#FFB5A7";
            const c2 = target.colors?.[1] ?? "#FF8A65";
            const isHovered = hoveredCardId === target.id;

            return (
              <div
                key={target.id}
                onMouseEnter={() => setHoveredCardId(target.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  boxShadow: isHovered
                    ? `0 18px 48px -10px ${c1}33`
                    : undefined,
                  borderColor: isHovered ? `${c1}66` : undefined,
                }}
                className="group glass p-7 flex flex-col justify-between gap-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="space-y-4">
                  {/* Top Row: CSS sphere + 1 Type Chip */}
                  <div className="flex items-center justify-between gap-4">
                    <div
                      className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/20"
                      style={{
                        background: `radial-gradient(circle at 30% 28%, ${c1} 0%, ${c2} 58%, #07090F 96%)`,
                        boxShadow: `inset -8px -8px 18px rgba(7,9,15,0.75), 0 0 20px ${c1}33`,
                      }}
                    >
                      <div
                        className="target-sphere-bands absolute inset-0 opacity-30"
                        style={{
                          backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 5px, rgba(255,255,255,0.2) 6px, transparent 10px)`,
                          backgroundSize: "200% 200%",
                        }}
                      />
                      <div
                        className="target-sphere-highlight absolute w-7 h-7 rounded-full blur-[3px] top-1.5 left-1.5"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 72%)",
                        }}
                      />
                    </div>

                    <span
                      className="px-3.5 py-1 rounded-full text-[15px] border"
                      style={{
                        backgroundColor: `${c1}15`,
                        borderColor: `${c1}40`,
                        color: "#F3F2EA",
                      }}
                    >
                      {target.type}
                    </span>
                  </div>

                  {/* Target Name, Nickname & Story */}
                  <div className="space-y-1.5">
                    <div className="text-[14px] text-cosmic-muted">
                      {target.name}
                    </div>
                    <h3 className="font-heading text-2xl font-medium tracking-[0.02em] text-cosmic-text leading-snug">
                      {target.nickname}
                    </h3>
                    <p className="text-base text-cosmic-muted leading-[1.6] pt-1">
                      {target.story}
                    </p>
                  </div>
                </div>

                {/* Bottom Footer: Distance + Investigate Button */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[14px] font-mono text-cosmic-muted">
                    {formatTargetDistance(target.distanceLy)}
                  </span>

                  <Link
                    href={`/viewer?target=${target.id}`}
                    onClick={() => playSound("whoosh")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[17px] font-medium bg-white/10 group-hover:bg-infrared-gradient group-hover:text-[#07090F] text-cosmic-text border border-white/15 transition-all"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4: WHY IT MATTERS */}
      <section>
        <div className="glass p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <h2 className="font-heading text-[clamp(2rem,4vw,3.25rem)] font-medium tracking-[0.02em] text-cosmic-text">
              Too much sky for one person
            </h2>

            <p className="text-base sm:text-lg text-cosmic-muted leading-[1.6]">
              Sky surveys record more than a billion objects. Many nearby brown
              dwarfs and comets were found by people comparing images by eye.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/explore"
              onClick={() => playSound("whoosh")}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full font-medium text-[17px] bg-infrared-gradient text-[#07090F] shadow-infrared-glow hover:opacity-95 transition-opacity"
            >
              <span>Start Investigating</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
