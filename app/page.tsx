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
  Sparkles,
  GraduationCap,
  Telescope,
  Orbit,
} from "lucide-react";
import { getTargets, getFrames } from "@/lib/api";
import type { Target, TargetMeta } from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] flex flex-col items-center justify-center select-none">
      <div className="w-full h-full rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center relative overflow-hidden">
        {/* CSS Gradient Sphere Placeholder (no layout jump) */}
        <div
          className="w-44 h-44 sm:w-56 sm:h-56 rounded-full relative shadow-[0_0_80px_rgba(195,177,225,0.35)]"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, #FFB5A7 0%, #C3B1E1 48%, #4B3A8C 88%, #0B0B1E 100%)",
          }}
        >
          <div className="absolute -inset-6 rounded-full border border-[#FFB5A7]/30 rotate-[-18deg] scale-x-125" />
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-cosmic-muted">
        <Orbit className="w-3.5 h-3.5 text-pastel-lavender" />
        <span>Drag to rotate 360°</span>
      </div>
    </div>
  ),
});

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
    number: "01",
    title: "Search the sky",
    description: "Enter coordinates or pick a famous object.",
    icon: Search,
    accent: "#A2D2FF",
  },
  {
    number: "02",
    title: "Blink the images",
    description:
      "Watch SPHEREx photos from different dates play like a video.",
    icon: Layers,
    accent: "#C3B1E1",
  },
  {
    number: "03",
    title: "Spot the mover",
    description:
      "Click anything that moved and mark it as a candidate.",
    icon: Crosshair,
    accent: "#FFB5A7",
  },
];

export default function HomePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [meta, setMeta] = useState<TargetMeta | null>(null);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  useEffect(() => {
    let active = true;
    getTargets().then((list) => {
      if (!active) return;
      setTargets(list);
      if (list[0]) {
        getFrames(list[0].id).then((m) => {
          if (active) setMeta(m);
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PageTransition className="max-w-[1200px] mx-auto space-y-28 sm:space-y-36 pb-16">
      {/* SECTION 1 — HERO (Full Viewport Height) */}
      <section className="min-h-[calc(100vh-6rem)] flex items-center py-6 lg:py-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Headline, Copy, CTAs, Stat Chips (sits below 3D scene on mobile) */}
          <div className="order-2 lg:order-1 lg:col-span-7 space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <div className="glass inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-cosmic-text">
                <Telescope className="w-4 h-4 text-pastel-peach shrink-0" />
                <span>Real images from NASA&apos;s SPHEREx telescope</span>
              </div>
              <SampleDataBadge source={meta?.source ?? "placeholder"} />
            </div>

            <h1 className="font-heading font-bold text-[44px] sm:text-[58px] lg:text-[72px] leading-[1.04] tracking-tight text-cosmic-text">
              <span className="block">Become a</span>
              <span className="block text-gradient-infrared">
                Cosmic Detective
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-cosmic-muted leading-relaxed max-w-xl">
              SPHEREx photographs the whole sky every six months. Compare its
              images over time and spot what moves — the same way Pluto was
              found.
            </p>

            {/* Primary & Secondary Action Pills */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link
                href="/explore"
                onClick={() => playSound("whoosh")}
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full font-heading font-semibold text-sm sm:text-base tracking-wide bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-all"
              >
                <span>Start Investigating</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/training"
                onClick={() => playSound("click")}
                className="glass inline-flex items-center gap-2.5 px-7 py-4 rounded-full font-heading font-medium text-sm sm:text-base text-cosmic-text hover:border-pastel-lavender/60 transition-all"
              >
                <GraduationCap className="w-4 h-4 text-pastel-lavender" />
                <span>Try Training Mode</span>
              </Link>
            </div>

            {/* Three Glass Stat Chips */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              {[
                "102 infrared colours",
                "Whole sky every 6 months",
                "1 billion+ objects",
              ].map((stat) => (
                <div
                  key={stat}
                  className="glass px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium text-cosmic-text flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-infrared-gradient" />
                  <span>{stat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Interactive 3D Planetary Scene (sits above text on mobile) */}
          <div className="order-1 lg:order-2 lg:col-span-5 w-full">
            <HeroScene />
          </div>
        </div>
      </section>

      {/* SECTION 2 — HOW IT WORKS */}
      <section className="space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-pastel-lavender">
            Three-Step Discovery Protocol
          </span>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold text-cosmic-text">
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
                    : { opacity: 0, y: 28 }
                }
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{
                  duration: 0.5,
                  delay: prefersReducedMotion ? 0 : index * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={prefersReducedMotion ? undefined : { y: -8 }}
                className="glass p-7 sm:p-8 flex flex-col justify-between gap-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                    style={{
                      backgroundColor: `${step.accent}1F`,
                      borderColor: `${step.accent}55`,
                      color: step.accent,
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-heading text-3xl font-bold text-cosmic-muted/40">
                    {index + 1}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <h3 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-cosmic-muted leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3 — FEATURED OBJECTS */}
      <section className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase tracking-[0.2em] text-pastel-peach">
                Calibrated SPHEREx Catalog
              </span>
              <SampleDataBadge source={meta?.source ?? "placeholder"} />
            </div>
            <h2 className="font-heading text-3xl sm:text-5xl font-bold text-cosmic-text">
              Start with a famous mover
            </h2>
          </div>

          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="inline-flex items-center gap-2 text-sm font-medium text-pastel-sky hover:underline"
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
                    ? `0 18px 48px -10px ${c1}44, 0 0 30px -6px ${c2}38`
                    : undefined,
                  borderColor: isHovered ? `${c1}77` : undefined,
                }}
                className="group glass p-7 flex flex-col justify-between gap-6 transition-all duration-300 hover:-translate-y-2"
              >
                <div className="space-y-5">
                  {/* Top Row: CSS 3D Rotating Sphere + Type Chip */}
                  <div className="flex items-center justify-between gap-4">
                    {/* CSS 3D-looking sphere with moving highlight */}
                    <div
                      className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/20"
                      style={{
                        background: `radial-gradient(circle at 30% 28%, ${c1} 0%, ${c2} 58%, #0B0B1E 96%)`,
                        boxShadow: `inset -8px -8px 18px rgba(11,11,30,0.75), 0 0 24px ${c1}44`,
                      }}
                    >
                      {/* Rotating atmospheric band overlay */}
                      <div
                        className="target-sphere-bands absolute inset-0 opacity-35"
                        style={{
                          backgroundImage: `repeating-linear-gradient(0deg, transparent 0px, transparent 5px, rgba(255,255,255,0.22) 6px, transparent 10px)`,
                          backgroundSize: "200% 200%",
                        }}
                      />
                      {/* Moving specular highlight */}
                      <div
                        className="target-sphere-highlight absolute w-8 h-8 rounded-full blur-[3px] top-1.5 left-1.5"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 72%)",
                        }}
                      />
                    </div>

                    <span
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: `${c1}1A`,
                        borderColor: `${c1}4D`,
                        color: "#EDEBFF",
                      }}
                    >
                      {target.type}
                    </span>
                  </div>

                  {/* Target Name, Big Nickname & Story */}
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-cosmic-muted">
                      {target.name}
                    </div>
                    <h3 className="font-heading text-2xl font-bold text-cosmic-text leading-snug">
                      {target.nickname}
                    </h3>
                    <p className="text-sm text-cosmic-muted leading-relaxed pt-1">
                      {target.story}
                    </p>
                  </div>
                </div>

                {/* Bottom Footer: Distance + Investigate Button */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-cosmic-muted">
                    {formatTargetDistance(target.distanceLy)}
                  </span>

                  <Link
                    href={`/viewer?target=${target.id}`}
                    onClick={() => playSound("whoosh")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 group-hover:bg-infrared-gradient group-hover:text-[#0B0B1E] text-cosmic-text border border-white/15 transition-all"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 4 — WHY IT MATTERS */}
      <section>
        <div className="p-[1.5px] rounded-[26px] bg-gradient-to-r from-[#C3B1E1]/50 via-[#FFB5A7]/50 to-[#A2D2FF]/50 shadow-glass-glow">
          <div className="glass rounded-[25px] p-8 sm:p-12 lg:p-14 bg-[#0B0B1E]/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-lavender/15 text-pastel-lavender border border-pastel-lavender/35">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Citizen Science Mission</span>
              </div>

              <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient-headline">
                Too much sky for one person
              </h2>

              <p className="text-base sm:text-lg text-cosmic-muted leading-relaxed">
                SPHEREx returns images of more than a billion objects. Most
                known comets and brown dwarfs were discovered by volunteers
                comparing images.{" "}
                <strong className="text-cosmic-text font-semibold">
                  Your eyes can help.
                </strong>
              </p>
            </div>

            <div className="shrink-0">
              <Link
                href="/explore"
                onClick={() => playSound("whoosh")}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full font-heading font-semibold text-sm sm:text-base tracking-wide bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity"
              >
                <span>Start Investigating</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
