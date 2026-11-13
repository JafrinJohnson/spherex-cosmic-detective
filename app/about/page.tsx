"use client";

import React from "react";
import Link from "next/link";
import {
  Telescope,
  Radio,
  Database,
  Layers,
  Globe,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";

export default function AboutPage() {
  return (
    <PageTransition className="space-y-12 pb-8">
      {/* Mission Hero */}
      <section className="glass p-8 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider bg-pastel-pink/15 border border-pastel-pink/35 text-pastel-pink">
            <Telescope className="w-4 h-4" />
            Mission Architecture &amp; Science Goals
          </span>
          <SampleDataBadge source="placeholder" />
        </div>

        <div className="max-w-3xl space-y-4">
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
            About NASA SPHEREx &amp; Cosmic Detective
          </h1>
          <p className="text-cosmic-muted text-base sm:text-lg leading-relaxed">
            SPHEREx (Spectro-Photometer for the History of the Universe, Epoch
            of Reionization and Ices Explorer) maps the entire sky four times
            during its nominal two-year mission, capturing near-infrared images
            across 102 individual color bands from 0.75 to 5.0 microns.
          </p>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-7 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-pastel-lavender/15 border border-pastel-lavender/35 flex items-center justify-center text-pastel-lavender">
            <Radio className="w-5 h-5" />
          </div>
          <h2 className="font-heading text-xl font-bold text-cosmic-text">
            Linear Variable Filters
          </h2>
          <p className="text-sm text-cosmic-muted leading-relaxed">
            Instead of a traditional moving grating, SPHEREx uses Linear
            Variable Filters (LVFs) whose bandpass shifts smoothly across the
            detector field of view. As spacecraft stepping scans the sky, every
            source is measured in 102 wavelength steps.
          </p>
        </div>

        <div className="glass p-7 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-pastel-peach/15 border border-pastel-peach/35 flex items-center justify-center text-pastel-peach">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="font-heading text-xl font-bold text-cosmic-text">
            Time-Domain Proper Motion
          </h2>
          <p className="text-sm text-cosmic-muted leading-relaxed">
            Because SPHEREx completes an all-sky map every 6 months, blinking
            multi-epoch images reveals high-proper-motion solar neighborhood
            neighbors—such as Barnard&apos;s Star, WISE 0855−0714, and Epsilon
            Indi B—alongside dust-enshrouded variable stars.
          </p>
        </div>

        <div className="glass p-7 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-pastel-sky/15 border border-pastel-sky/35 flex items-center justify-center text-pastel-sky">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="font-heading text-xl font-bold text-cosmic-text">
            Open Archive via IRSA
          </h2>
          <p className="text-sm text-cosmic-muted leading-relaxed">
            All calibrated spectral images and catalogs are publicly archived at
            the NASA/IPAC Infrared Science Archive (IRSA). Cosmic Detective
            provides an interactive front-end ready to stream live IRSA cutouts
            or run offline with calibrated local sample datasets.
          </p>
        </div>
      </section>

      {/* Attribution & API Integration Card */}
      <section className="glass p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-pastel-mint">
            <Globe className="w-4 h-4" />
            <span>Data Provenance &amp; Credits</span>
          </div>
          <h2 className="font-heading text-2xl font-bold text-cosmic-text">
            Data: NASA / JPL-Caltech / IPAC — SPHEREx via IRSA
          </h2>
          <p className="text-sm text-cosmic-muted leading-relaxed">
            When <code className="text-cosmic-text">NEXT_PUBLIC_API_URL</code>{" "}
            is unset, Cosmic Detective serves deterministic 512×512 multi-epoch
            star-field frames and 102-point spectra from{" "}
            <code className="text-cosmic-text">/public/data</code> with automatic
            fallback protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
          >
            <span>Explore Targets</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <a
            href="https://spherex.caltech.edu/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
          >
            <span>Official SPHEREx Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </PageTransition>
  );
}

