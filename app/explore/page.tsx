"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Crosshair,
} from "lucide-react";
import { getTargets, searchSky } from "@/lib/api";
import type { Target, SkySearchResult } from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const TAG_FILTERS = [
  { id: "all", label: "All Objects" },
  { id: "fast", label: "Fast Proper Motion" },
  { id: "brown-dwarf", label: "Brown Dwarfs" },
  { id: "variable", label: "Variable Stars" },
];

export default function ExplorePage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [activeTag, setActiveTag] = useState<string>("all");
  const [raInput, setRaInput] = useState<string>("269.4521");
  const [decInput, setDecInput] = useState<string>("4.6934");
  const [fovInput, setFovInput] = useState<string>("15");
  const [searchResult, setSearchResult] = useState<SkySearchResult | null>(
    null
  );
  const [searching, setSearching] = useState<boolean>(false);
  const { playSound } = useSound();

  useEffect(() => {
    let mounted = true;
    getTargets().then((list) => {
      if (mounted) setTargets(list);
    });
    searchSky(269.4521, 4.6934, 15).then((res) => {
      if (mounted) setSearchResult(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredTargets =
    activeTag === "all"
      ? targets
      : targets.filter((t) => t.tags.includes(activeTag));

  const handleConeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    playSound("whoosh");
    setSearching(true);
    const ra = parseFloat(raInput);
    const dec = parseFloat(decInput);
    const fov = parseFloat(fovInput);
    const res = await searchSky(ra, dec, fov);
    setSearchResult(res);
    setSearching(false);
  };

  return (
    <PageTransition className="space-y-12 pb-8">
      {/* Header Banner */}
      <section className="glass p-8 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase bg-pastel-sky/15 border border-pastel-sky/35 text-pastel-sky">
            <Compass className="w-3.5 h-3.5" />
            <span>SPHEREx All-Sky Cone Search &amp; Target Archive</span>
          </div>
          <SampleDataBadge source={searchResult?.source ?? "placeholder"} />
        </div>

        <div className="max-w-3xl space-y-3">
          <h1 className="font-heading text-3xl sm:text-5xl font-bold text-gradient-headline">
            Explore the Infrared Sky
          </h1>
          <p className="text-cosmic-muted text-base leading-relaxed">
            Query the SPHEREx coordinate catalog by Right Ascension and
            Declination (J2000), or filter curated high-proper-motion and
            variable targets ready for multi-epoch frame blinking.
          </p>
        </div>

        {/* Coordinate Cone Search Form */}
        <form
          onSubmit={handleConeSearch}
          className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2"
        >
          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15">
            <label
              htmlFor="ra-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-cosmic-muted"
            >
              Right Ascension (deg)
            </label>
            <input
              id="ra-input"
              type="number"
              step="0.0001"
              value={raInput}
              onChange={(e) => setRaInput(e.target.value)}
              className="mt-1 w-full bg-transparent font-mono text-base text-cosmic-text focus:outline-none"
              placeholder="0.0000 – 360.0000"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15">
            <label
              htmlFor="dec-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-cosmic-muted"
            >
              Declination (deg)
            </label>
            <input
              id="dec-input"
              type="number"
              step="0.0001"
              value={decInput}
              onChange={(e) => setDecInput(e.target.value)}
              className="mt-1 w-full bg-transparent font-mono text-base text-cosmic-text focus:outline-none"
              placeholder="-90.0000 – +90.0000"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-white/15">
            <label
              htmlFor="fov-input"
              className="block text-[11px] font-mono uppercase tracking-wider text-cosmic-muted"
            >
              Field of View (arcmin)
            </label>
            <input
              id="fov-input"
              type="number"
              step="1"
              min="1"
              max="120"
              value={fovInput}
              onChange={(e) => setFovInput(e.target.value)}
              className="mt-1 w-full bg-transparent font-mono text-base text-cosmic-text focus:outline-none"
              placeholder="15"
            />
          </div>

          <button
            type="submit"
            disabled={searching}
            className="rounded-2xl font-heading font-semibold text-sm uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity flex items-center justify-center gap-2 px-6 py-4"
          >
            <Search className="w-4 h-4" />
            <span>{searching ? "Querying..." : "Search Sky"}</span>
          </button>
        </form>

        {/* Cone Search Match Banner */}
        {searchResult && searchResult.matchedTarget && (
          <div className="p-5 rounded-2xl bg-white/[0.05] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-pastel-mint">
                <Crosshair className="w-3.5 h-3.5" />
                <span>
                  NEAREST ARCHIVE FIELD FOR RA {searchResult.ra.toFixed(4)}°,
                  DEC {searchResult.dec.toFixed(4)}° (FOV{" "}
                  {searchResult.fovArcmin}&prime;)
                </span>
              </div>
              <div className="font-heading text-lg font-bold text-cosmic-text">
                {searchResult.matchedTarget.name}{" "}
                <span className="text-sm font-normal text-cosmic-muted">
                  ({searchResult.matchedTarget.nickname})
                </span>
              </div>
              <p className="text-xs text-cosmic-muted">
                Angular separation:{" "}
                {searchResult.nearbyTargets[0]?.separationDeg.toFixed(3)}° ·
                Pixel scale: {searchResult.meta.pixelScaleArcsec}&Prime;/px
              </p>
            </div>

            <div className="flex items-center gap-3">
              <SampleDataBadge source={searchResult.source} />
              <Link
                href={`/viewer?target=${searchResult.matchedTarget.id}&ra=${searchResult.ra}&dec=${searchResult.dec}`}
                onClick={() => playSound("whoosh")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/15 hover:bg-white/25 text-cosmic-text transition-colors"
              >
                <span>Open in Viewer</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Filter Bar & Target Grid */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-pastel-lavender" />
            <span className="text-xs font-mono uppercase tracking-wider text-cosmic-muted">
              Filter by Astrophysical Class
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {TAG_FILTERS.map((f) => {
              const active = activeTag === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setActiveTag(f.id);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-pastel-lavender/25 border border-pastel-lavender text-cosmic-text"
                      : "glass text-cosmic-muted hover:text-cosmic-text"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTargets.map((target) => (
            <div
              key={target.id}
              className="glass p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${target.colors[0]}, ${target.colors[1]})`,
                      }}
                    />
                    <span className="text-xs font-semibold uppercase tracking-wider text-pastel-sky">
                      {target.type}
                    </span>
                  </div>
                  <SampleDataBadge source="placeholder" />
                </div>

                <div>
                  <h2 className="font-heading text-2xl font-bold text-cosmic-text">
                    {target.name}
                  </h2>
                  <p className="text-sm font-medium text-pastel-peach">
                    {target.nickname}
                  </p>
                </div>

                <p className="text-sm text-cosmic-muted leading-relaxed">
                  {target.story}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                      RA (J2000)
                    </div>
                    <div className="font-mono text-sm font-semibold text-cosmic-text mt-0.5">
                      {target.ra.toFixed(4)}°
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                      Dec (J2000)
                    </div>
                    <div className="font-mono text-sm font-semibold text-cosmic-text mt-0.5">
                      {target.dec >= 0 ? "+" : ""}
                      {target.dec.toFixed(4)}°
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                      Distance
                    </div>
                    <div className="font-mono text-sm font-semibold text-cosmic-text mt-0.5">
                      {target.distanceLy !== null
                        ? `${target.distanceLy} ly`
                        : "Variable"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-1.5">
                  {target.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/[0.06] text-cosmic-muted border border-white/10"
                    >
                      <Sparkles className="w-3 h-3 text-pastel-lavender" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setRaInput(String(target.ra));
                      setDecInput(String(target.dec));
                    }}
                    className="px-3.5 py-2 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-cosmic-muted hover:text-cosmic-text transition-colors"
                  >
                    Load Coords
                  </button>
                  <Link
                    href={`/viewer?target=${target.id}&ra=${target.ra}&dec=${target.dec}`}
                    onClick={() => playSound("whoosh")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
                  >
                    <span>Open Blinker</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageTransition>
  );
}

