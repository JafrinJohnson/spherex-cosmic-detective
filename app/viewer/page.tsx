"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Crosshair,
  Activity,
  Layers,
  CheckCircle2,
  Compass,
} from "lucide-react";
import {
  getTargets,
  getTarget,
  getFrames,
  getSpectrum,
  searchSky,
} from "@/lib/api";
import type {
  Target,
  TargetMeta,
  SpectrumPoint,
  CandidateSubmission,
} from "@/types";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const CANDIDATES_STORAGE_KEY = "cosmic-detective-candidates";

function ViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playSound } = useSound();

  const targetParam = searchParams.get("target") || "";
  const raParam = searchParams.get("ra");
  const decParam = searchParams.get("dec");

  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [currentTarget, setCurrentTarget] = useState<Target | null>(null);
  const [meta, setMeta] = useState<TargetMeta | null>(null);
  const [spectrum, setSpectrum] = useState<SpectrumPoint[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [blinkIntervalMs, setBlinkIntervalMs] = useState<number>(650);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>({
    x: 46,
    y: 51,
  });
  const [loggedBanner, setLoggedBanner] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    async function loadViewerData() {
      const list = await getTargets();
      if (!active) return;
      setAllTargets(list);

      let resolvedTarget: Target | null = null;
      if (targetParam) {
        resolvedTarget = await getTarget(targetParam);
      } else if (raParam && decParam) {
        const sky = await searchSky(
          parseFloat(raParam),
          parseFloat(decParam),
          15
        );
        resolvedTarget = sky.matchedTarget ?? list[0] ?? null;
      } else {
        resolvedTarget = list[0] ?? null;
      }

      if (!active || !resolvedTarget) return;
      setCurrentTarget(resolvedTarget);

      const [framesMeta, specData] = await Promise.all([
        getFrames(resolvedTarget.id),
        getSpectrum(resolvedTarget.id),
      ]);

      if (!active) return;
      setMeta(framesMeta);
      setSpectrum(specData);
      setFrameIndex(0);
    }

    loadViewerData();
    return () => {
      active = false;
    };
  }, [targetParam, raParam, decParam]);

  // Frame blinker timer
  useEffect(() => {
    if (!isPlaying || !meta || meta.frames.length <= 1) return;
    const timer = window.setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % meta.frames.length);
    }, blinkIntervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, blinkIntervalMs, meta]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Math.max(
      0,
      Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)
    );
    const yPct = Math.max(
      0,
      Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)
    );
    playSound("click");
    setMarker({ x: Number(xPct.toFixed(1)), y: Number(yPct.toFixed(1)) });
    setLoggedBanner(false);
  };

  const handleLogCandidate = () => {
    if (!currentTarget || !marker) return;
    playSound("success");
    try {
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // Ignore confetti errors in headless environments
    }

    const activeFrame = meta?.frames[frameIndex];
    const newCandidate: CandidateSubmission = {
      id: `cand-${Date.now()}`,
      targetId: currentTarget.id,
      targetName: currentTarget.name,
      ra: Number(
        (currentTarget.ra + (marker.x - 50) * 0.0018).toFixed(4)
      ),
      dec: Number(
        (currentTarget.dec + (50 - marker.y) * 0.0018).toFixed(4)
      ),
      pixelX: Math.round((marker.x / 100) * 512),
      pixelY: Math.round((marker.y / 100) * 512),
      epochDate: activeFrame?.date ?? "2025-06-01",
      classification: currentTarget.tags.includes("brown-dwarf")
        ? "Brown Dwarf Candidate"
        : currentTarget.tags.includes("variable")
        ? "Variable Source"
        : "High Proper Motion",
      confidence: 94,
      notes: `Multi-epoch blink detection near ${currentTarget.name} (${currentTarget.nickname}).`,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    try {
      const existingRaw = window.localStorage.getItem(CANDIDATES_STORAGE_KEY);
      const existing: CandidateSubmission[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      window.localStorage.setItem(
        CANDIDATES_STORAGE_KEY,
        JSON.stringify([newCandidate, ...existing])
      );
    } catch {
      // Ignore storage errors
    }

    setLoggedBanner(true);
  };

  const activeFrame = meta?.frames[frameIndex];
  const frameSrc =
    activeFrame?.url ||
    (currentTarget && activeFrame
      ? `/data/${currentTarget.id}/frames/${activeFrame.file}`
      : "/data/barnards-star/frames/frame-01.png");

  return (
    <div className="space-y-10 pb-8">
      {/* Top Control & Target Selector Bar */}
      <section className="glass p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-pastel-lavender/15 text-pastel-lavender border border-pastel-lavender/35">
              <Layers className="w-3.5 h-3.5" />
              Multi-Epoch Blink Comparator
            </span>
            <SampleDataBadge source={meta?.source ?? "placeholder"} />
          </div>

          <h1 className="font-heading text-2xl sm:text-4xl font-bold text-gradient-headline">
            {currentTarget ? currentTarget.name : "Loading Sky Region..."}
          </h1>

          {currentTarget && (
            <p className="text-sm text-cosmic-muted">
              <span className="text-pastel-peach font-medium">
                {currentTarget.nickname}
              </span>{" "}
              — {currentTarget.story}
            </p>
          )}
        </div>

        {/* Target Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {allTargets.map((t) => {
            const selected = currentTarget?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playSound("click");
                  router.push(
                    `/viewer?target=${t.id}&ra=${t.ra}&dec=${t.dec}`
                  );
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                  selected
                    ? "bg-infrared-gradient text-[#0B0B1E] font-semibold shadow-infrared-glow"
                    : "bg-white/[0.06] hover:bg-white/[0.14] text-cosmic-muted hover:text-cosmic-text border border-white/10"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Blinker + Telemetry & Spectrum Workspace */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 6 Columns: 512x512 Frame Blinker */}
        <div className="lg:col-span-6 glass p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-cosmic-muted">
                Epoch {frameIndex + 1} of {meta?.frames.length ?? 4} ·{" "}
                {activeFrame?.date ?? "2025-06-01"}
              </div>
              <div className="text-sm font-heading font-semibold text-cosmic-text">
                Band: {activeFrame?.band.toUpperCase() ?? "ALL"} · Scale:{" "}
                {meta?.pixelScaleArcsec ?? 6.2}&Prime;/px
              </div>
            </div>
            <SampleDataBadge source={meta?.source ?? "placeholder"} />
          </div>

          {/* Interactive Star-Field Viewport */}
          <div
            onClick={handleImageClick}
            role="button"
            tabIndex={0}
            aria-label="SPHEREx multi-epoch star field. Click to place target reticle."
            onKeyDown={(e) => {
              if (e.key === " ") {
                e.preventDefault();
                setIsPlaying((p) => !p);
              }
            }}
            className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/20 cursor-crosshair bg-[#0B0B1E] select-none"
          >
            <Image
              src={frameSrc}
              alt={`${currentTarget?.name ?? "SPHEREx"} frame ${frameIndex + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 512px"
              className="object-cover"
              priority
            />

            {/* Coordinate Grid Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />

            {/* Reticle Marker */}
            {marker && (
              <div
                style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
              >
                <div className="w-9 h-9 rounded-full border-2 border-[#FFD166] shadow-[0_0_16px_rgba(255,209,102,0.7)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A65]" />
                </div>
              </div>
            )}

            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono bg-[#0B0B1E]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-cosmic-muted">
              <span>
                RA {(raParam ? parseFloat(raParam) : currentTarget?.ra ?? 269.4521).toFixed(4)}° · DEC{" "}
                {(decParam ? parseFloat(decParam) : currentTarget?.dec ?? 4.6934).toFixed(4)}°
              </span>
              <span>CLICK FRAME TO MARK SOURCE</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsPlaying(false);
                    setFrameIndex((prev) =>
                      prev === 0 ? (meta?.frames.length ?? 4) - 1 : prev - 1
                    );
                  }}
                  aria-label="Previous frame"
                  className="p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsPlaying((p) => !p);
                  }}
                  className="px-5 py-2.5 rounded-full font-heading font-semibold text-xs uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause Blink</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Auto-Blink</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsPlaying(false);
                    setFrameIndex(
                      (prev) => (prev + 1) % (meta?.frames.length ?? 4)
                    );
                  }}
                  aria-label="Next frame"
                  className="p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center gap-2 text-xs text-cosmic-muted">
                <span className="font-mono">Cadence:</span>
                {[900, 650, 380].map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setBlinkIntervalMs(ms);
                    }}
                    className={`px-2.5 py-1 rounded-full font-mono text-[11px] border ${
                      blinkIntervalMs === ms
                        ? "bg-pastel-sky/20 border-pastel-sky text-cosmic-text"
                        : "bg-white/[0.04] border-white/10 text-cosmic-muted"
                    }`}
                  >
                    {ms === 900 ? "Slow" : ms === 650 ? "Normal" : "Fast"}
                  </button>
                ))}
              </div>
            </div>

            {/* Epoch Frame Pills */}
            <div className="grid grid-cols-4 gap-2">
              {(meta?.frames ?? []).map((frame, idx) => (
                <button
                  key={frame.file}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setIsPlaying(false);
                    setFrameIndex(idx);
                  }}
                  className={`py-2 px-3 rounded-xl text-center border transition-all ${
                    frameIndex === idx
                      ? "bg-pastel-lavender/25 border-pastel-lavender text-cosmic-text"
                      : "bg-white/[0.04] border-white/10 text-cosmic-muted hover:text-cosmic-text"
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase">
                    Epoch 0{idx + 1}
                  </div>
                  <div className="text-xs font-semibold mt-0.5">
                    {frame.date}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 6 Columns: 102-Point SPHEREx Spectrum + Candidate Logger */}
        <div className="lg:col-span-6 space-y-6">
          {/* 102-Channel Infrared Spectrum Card */}
          <div className="glass p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-pastel-peach">
                  <Activity className="w-3.5 h-3.5" />
                  <span>SPHEREx 102-Channel Spectrophotometry</span>
                </div>
                <h2 className="font-heading text-xl font-bold text-cosmic-text mt-1">
                  Infrared Spectral Energy Distribution (0.75 – 5.0 μm)
                </h2>
              </div>
              <SampleDataBadge source={meta?.source ?? "placeholder"} />
            </div>

            <div className="h-[270px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={spectrum}
                  margin={{ top: 10, right: 12, left: -12, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="irFluxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF8A65" stopOpacity={0.65} />
                      <stop offset="95%" stopColor="#C3B1E1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <XAxis
                    dataKey="wavelength"
                    type="number"
                    domain={[0.75, 5.0]}
                    tickCount={8}
                    stroke="#CFCBEA"
                    fontSize={11}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}μm`}
                  />
                  <YAxis
                    stroke="#CFCBEA"
                    fontSize={11}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(11, 11, 30, 0.94)",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      borderRadius: "14px",
                      fontSize: "12px",
                      color: "#EDEBFF",
                    }}
                    formatter={(value: number) => [`${value} μJy`, "IR Flux"]}
                    labelFormatter={(label: number) =>
                      `Wavelength: ${Number(label).toFixed(3)} μm`
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="flux"
                    stroke="#FFD166"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#irFluxGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-xs text-cosmic-muted leading-relaxed">
              Showing {spectrum.length} spectral channels across SPHEREx Linear
              Variable Filters (LVFs). Absorption bands near 1.4, 1.9, and 3.3
              μm distinguish ultracool brown dwarfs (CH₄/H₂O) from background
              galaxies and reddened giants.
            </p>
          </div>

          {/* Astrometric Candidate Flagging Panel */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-pastel-mint" />
                <h2 className="font-heading text-lg font-bold text-cosmic-text">
                  Astrometric Reticle &amp; Candidate Logger
                </h2>
              </div>
              <Link
                href="/candidates"
                className="text-xs font-medium text-pastel-sky hover:underline"
              >
                View All Logged Candidates
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                  Reticle X / Y
                </div>
                <div className="font-mono text-sm font-semibold text-cosmic-text mt-0.5">
                  {marker
                    ? `${Math.round((marker.x / 100) * 512)}, ${Math.round(
                        (marker.y / 100) * 512
                      )} px`
                    : "Unset"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                  Object Type
                </div>
                <div className="text-sm font-semibold text-pastel-peach mt-0.5 truncate">
                  {currentTarget?.type ?? "Red dwarf"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                  Distance
                </div>
                <div className="font-mono text-sm font-semibold text-cosmic-text mt-0.5">
                  {currentTarget?.distanceLy !== null &&
                  currentTarget?.distanceLy !== undefined
                    ? `${currentTarget.distanceLy} ly`
                    : "Variable"}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <div className="text-[10px] font-mono uppercase text-cosmic-muted">
                  Active Epoch
                </div>
                <div className="font-mono text-sm font-semibold text-pastel-mint mt-0.5">
                  {activeFrame?.date ?? "2025-06-01"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleLogCandidate}
                className="px-5 py-3 rounded-full font-heading font-semibold text-xs uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 transition-opacity"
              >
                Flag Moving Object at Reticle
              </button>

              {loggedBanner && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-pastel-mint">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved to Candidate Log!
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <PageTransition>
      <Suspense
        fallback={
          <div className="glass p-12 text-center space-y-3">
            <Compass className="w-8 h-8 text-pastel-lavender animate-spin mx-auto" />
            <div className="font-heading text-lg text-cosmic-text">
              Loading SPHEREx Multi-Epoch Blinker...
            </div>
          </div>
        }
      >
        <ViewerContent />
      </Suspense>
    </PageTransition>
  );
}

