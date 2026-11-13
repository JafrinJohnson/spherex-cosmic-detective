"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  Lightbulb,
  Crosshair,
  Layers,
} from "lucide-react";
import { getTargets, getTarget, getFrames, searchSky } from "@/lib/api";
import { formatRA, formatDec } from "@/lib/coords";
import type { Target, TargetMeta } from "@/types";
import {
  BlinkPlayer,
  type PixelClickEvent,
} from "@/components/viewer/BlinkPlayer";
import { PageTransition } from "@/components/PageTransition";
import { SampleDataBadge } from "@/components/SampleDataBadge";
import { useSound } from "@/components/SoundProvider";

const BAND_LABELS: Record<string, string> = {
  all: "All bands (0.75–5.00 µm)",
  "1": "Band 1 (0.75–1.09 µm)",
  "2": "Band 2 (1.10–1.62 µm)",
  "3": "Band 3 (1.63–2.41 µm)",
  "4": "Band 4 (2.42–3.82 µm)",
  "5": "Band 5 (3.83–4.41 µm)",
  "6": "Band 6 (4.42–5.00 µm)",
};

function angularDistanceDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const toRad = Math.PI / 180;
  const d1 = dec1 * toRad;
  const d2 = dec2 * toRad;
  const dRa = (ra2 - ra1) * toRad;
  const cosAngle =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(dRa);
  const clamped = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(clamped) / toRad;
}

function ViewerShimmerSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-16 animate-pulse">
      <div className="glass p-6 sm:p-8 space-y-4">
        <div className="h-4 w-24 rounded-full bg-white/10" />
        <div className="h-9 w-72 sm:w-96 rounded-2xl bg-white/15" />
        <div className="h-4 w-full max-w-xl rounded-full bg-white/10" />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-[2] glass p-6 space-y-5">
          <div className="w-full max-w-[640px] mx-auto aspect-square rounded-2xl bg-white/[0.06]" />
          <div className="h-14 w-full rounded-2xl bg-white/[0.06]" />
        </div>
        <div className="flex-[1] glass p-6 space-y-4 h-96">
          <div className="h-6 w-40 rounded-full bg-white/15" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
            <div className="h-10 w-full rounded-xl bg-white/[0.06]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { playSound } = useSound();

  const targetParam = searchParams.get("target")?.trim() || "";
  const raParam = searchParams.get("ra")?.trim() || "";
  const decParam = searchParams.get("dec")?.trim() || "";
  const fovParam = searchParams.get("fov")?.trim() || "5";
  const bandParam = searchParams.get("band")?.trim() || "all";

  const fovArcmin = Number.isFinite(Number(fovParam))
    ? Math.max(2, Math.min(15, Number(fovParam)))
    : 5;
  const bandLabel = BAND_LABELS[bandParam] ?? `Band ${bandParam}`;

  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [activeTarget, setActiveTarget] = useState<Target | null>(null);
  const [meta, setMeta] = useState<TargetMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unmatchedOfflineSky, setUnmatchedOfflineSky] = useState<boolean>(false);

  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 512, height: 512 });
  const [lastClickedPixel, setLastClickedPixel] =
    useState<PixelClickEvent | null>(null);

  const loadSkyData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setUnmatchedOfflineSky(false);

    try {
      const catalog = await getTargets();
      setAllTargets(catalog);

      // Case 1: `target` query param is provided
      if (targetParam) {
        const foundTarget = await getTarget(targetParam);
        if (!foundTarget) {
          setErrorMsg(`Could not load target "${targetParam}".`);
          setLoading(false);
          return;
        }
        const framesMeta = await getFrames(foundTarget.id);
        setActiveTarget(foundTarget);
        setMeta(framesMeta);
        setCurrentFrameIndex(0);
        setLoading(false);
        return;
      }

      // Case 2: Only `ra` & `dec` are given
      if (raParam && decParam) {
        const raNum = Number(raParam);
        const decNum = Number(decParam);
        if (!Number.isFinite(raNum) || !Number.isFinite(decNum)) {
          setErrorMsg("The provided Right Ascension or Declination is invalid.");
          setLoading(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
        const matchedWithin01 = catalog.find(
          (t) => angularDistanceDeg(raNum, decNum, t.ra, t.dec) <= 0.1
        );

        // If no backend is configured and position is not within 0.1° of one of the 5 targets
        if (!apiUrl && !matchedWithin01) {
          setActiveTarget(null);
          setMeta(null);
          setUnmatchedOfflineSky(true);
          setLoading(false);
          return;
        }

        if (matchedWithin01 && !apiUrl) {
          const framesMeta = await getFrames(matchedWithin01.id);
          setActiveTarget(matchedWithin01);
          setMeta(framesMeta);
          setCurrentFrameIndex(0);
          setLoading(false);
          return;
        }

        const skyRes = await searchSky(raNum, decNum, fovArcmin);
        setActiveTarget(skyRes.matchedTarget);
        setMeta(skyRes.meta);
        setCurrentFrameIndex(0);
        setLoading(false);
        return;
      }

      // Default fallback when visiting `/viewer` with no params
      const defaultTarget = catalog[0] ?? (await getTarget("barnards-star"));
      if (defaultTarget) {
        const framesMeta = await getFrames(defaultTarget.id);
        setActiveTarget(defaultTarget);
        setMeta(framesMeta);
        setCurrentFrameIndex(0);
      } else {
        setErrorMsg("Unable to load SPHEREx target catalog.");
      }
    } catch {
      setErrorMsg("An unexpected error occurred while loading SPHEREx frames.");
    } finally {
      setLoading(false);
    }
  }, [targetParam, raParam, decParam, fovArcmin]);

  useEffect(() => {
    loadSkyData();
  }, [loadSkyData]);

  const handleImageDimensionsLoaded = useCallback((w: number, h: number) => {
    setImageDimensions({ width: w, height: h });
  }, []);

  const handlePixelClick = useCallback((event: PixelClickEvent) => {
    setLastClickedPixel(event);
  }, []);

  if (loading) {
    return <ViewerShimmerSkeleton />;
  }

  if (errorMsg) {
    return (
      <div className="max-w-[1200px] mx-auto py-12">
        <div className="glass p-8 sm:p-10 max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-pastel-peach/15 border border-pastel-peach/35 flex items-center justify-center text-pastel-peach mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-cosmic-text">
            Unable to Load Sky Field
          </h1>
          <p className="text-sm text-cosmic-muted">{errorMsg}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                loadSkyData();
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try again</span>
            </button>
            <Link
              href="/explore"
              className="px-5 py-3 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
            >
              ← Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Friendly card when NEXT_PUBLIC_API_URL is empty and custom RA/Dec is not within 0.1° of the 5 targets
  if (unmatchedOfflineSky) {
    const displayRa = Number(raParam);
    const displayDec = Number(decParam);
    return (
      <div className="max-w-[1200px] mx-auto space-y-8 pb-16">
        <div className="glass p-6 sm:p-8 space-y-3">
          <Link
            href="/explore"
            onClick={() => playSound("click")}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-pastel-sky hover:underline"
          >
            <span>← Explore</span>
          </Link>
          <h1 className="font-heading text-2xl sm:text-4xl font-bold text-gradient-headline">
            Sky at RA {displayRa.toFixed(4)}°, Dec {displayDec.toFixed(4)}°
          </h1>
          <p className="text-xs sm:text-sm text-cosmic-muted font-mono">
            {formatRA(displayRa)} · {formatDec(displayDec)} · FOV {fovArcmin}′ ·{" "}
            {bandLabel}
          </p>
        </div>

        <div className="glass p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-pastel-lavender/15 border border-pastel-lavender/35 flex items-center justify-center text-pastel-lavender shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text">
                Live search turns on when the data server is connected. Try a
                famous mover:
              </h2>
              <p className="text-sm text-cosmic-muted leading-relaxed">
                Select one of the five calibrated SPHEREx multi-epoch targets
                below to launch the interactive blink comparator immediately.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {allTargets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playSound("whoosh");
                  router.push(
                    `/viewer?target=${t.id}&ra=${t.ra}&dec=${t.dec}&fov=${fovArcmin}&band=${bandParam}`
                  );
                }}
                className="glass px-5 py-3 rounded-full text-xs sm:text-sm font-medium text-cosmic-text hover:border-pastel-peach flex items-center gap-2.5 transition-all"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: t.colors[0] }}
                />
                <span className="font-heading font-semibold">{t.name}</span>
                <span className="text-xs text-cosmic-muted">
                  ({t.nickname})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayRa = activeTarget
    ? activeTarget.ra
    : Number.isFinite(Number(raParam))
    ? Number(raParam)
    : 269.4521;
  const displayDec = activeTarget
    ? activeTarget.dec
    : Number.isFinite(Number(decParam))
    ? Number(decParam)
    : 4.6934;

  const frames = meta?.frames ?? [];
  const activeFrame = frames[currentFrameIndex] ?? frames[0];
  const pixelScale = meta?.pixelScaleArcsec ?? 6.2;
  const isPlaceholderSource = (meta?.source ?? "placeholder") === "placeholder";

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-16">
      {/* PAGE HEADER */}
      <section className="glass p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              onClick={() => playSound("click")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 text-pastel-sky transition-colors"
            >
              <span>← Explore</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-pastel-lavender/15 text-pastel-lavender border border-pastel-lavender/35">
              <Layers className="w-3.5 h-3.5" />
              <span>{frames.length} SPHEREx visits</span>
            </span>

            {isPlaceholderSource && (
              <SampleDataBadge source={meta?.source ?? "placeholder"} />
            )}
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient-headline">
            {activeTarget
              ? activeTarget.nickname
              : `Sky at RA ${displayRa.toFixed(2)}°, Dec ${displayDec.toFixed(2)}°`}
          </h1>

          {/* Sub line: real name · type · formatted RA/Dec · FOV 5′ · band */}
          <p className="text-xs sm:text-sm text-cosmic-muted flex flex-wrap items-center gap-x-2 gap-y-1">
            {activeTarget && (
              <>
                <span className="font-semibold text-cosmic-text">
                  {activeTarget.name}
                </span>
                <span>·</span>
                <span className="text-pastel-peach">{activeTarget.type}</span>
                <span>·</span>
              </>
            )}
            <span className="font-mono text-pastel-sky">
              {formatRA(displayRa)} {formatDec(displayDec)}
            </span>
            <span>·</span>
            <span>FOV {fovArcmin}′</span>
            <span>·</span>
            <span>{bandLabel}</span>
          </p>
        </div>

        {/* Quick Target Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {allTargets.map((t) => {
            const selected = activeTarget?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playSound("click");
                  router.push(
                    `/viewer?target=${t.id}&ra=${t.ra}&dec=${t.dec}&fov=${fovArcmin}&band=${bandParam}`
                  );
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? "bg-infrared-gradient text-[#0B0B1E] font-semibold border-transparent shadow-infrared-glow"
                    : "bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-cosmic-muted hover:text-cosmic-text"
                }`}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* MAIN TWO-COLUMN LAYOUT: Left = Viewer (flex 2), Right = Side Column (flex 1) */}
      <section className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column (flex 2): BlinkPlayer */}
        <div className="w-full lg:flex-[2] min-w-0">
          <BlinkPlayer
            frames={frames}
            pixelScaleArcsec={pixelScale}
            bandLabel={bandLabel}
            currentFrameIndex={currentFrameIndex}
            onFrameIndexChange={setCurrentFrameIndex}
            onImageDimensionsLoaded={handleImageDimensionsLoaded}
            onPixelClick={handlePixelClick}
            markedPixel={
              lastClickedPixel
                ? { x: lastClickedPixel.x, y: lastClickedPixel.y }
                : null
            }
          />
        </div>

        {/* Right Column (flex 1): Frame Info Card (F5 will add Detective Panel here) */}
        <aside className="w-full lg:flex-[1] space-y-6">
          <div className="glass p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-pastel-lavender" />
                <h2 className="font-heading text-lg font-bold text-cosmic-text">
                  Frame Info
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-white/[0.07] border border-white/15 text-pastel-sky">
                Visit {currentFrameIndex + 1} / {frames.length}
              </span>
            </div>

            <dl className="divide-y divide-white/10 text-xs sm:text-sm">
              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">Visit date</dt>
                <dd className="font-mono font-semibold text-cosmic-text">
                  {activeFrame?.date ?? "2025-06-01"}
                </dd>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">Infrared band</dt>
                <dd className="font-medium text-pastel-peach text-right">
                  {bandLabel}
                </dd>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">File name</dt>
                <dd className="font-mono text-cosmic-text">
                  {activeFrame?.file ?? "frame-01.png"}
                </dd>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">Image size</dt>
                <dd className="font-mono text-cosmic-text">
                  {imageDimensions.width} × {imageDimensions.height} px
                </dd>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">Pixel scale</dt>
                <dd className="font-mono text-cosmic-text">
                  {pixelScale}″ / pixel
                </dd>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <dt className="text-cosmic-muted">Data source</dt>
                <dd className="font-medium text-right text-pastel-mint">
                  {isPlaceholderSource
                    ? "Sample placeholder"
                    : "NASA SPHEREx via IRSA"}
                </dd>
              </div>
            </dl>

            {/* Clicked Pixel Telemetry Readout */}
            {lastClickedPixel && (
              <div className="p-3.5 rounded-2xl bg-white/[0.05] border border-[#FFD166]/40 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-pastel-peach font-medium">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Marked Position</span>
                </span>
                <span className="font-mono text-cosmic-text">
                  x: {lastClickedPixel.x} px, y: {lastClickedPixel.y} px (Visit{" "}
                  {lastClickedPixel.frameIndex + 1})
                </span>
              </div>
            )}

            {/* Short Tip Box */}
            <div className="p-4 rounded-2xl bg-pastel-lavender/10 border border-pastel-lavender/30 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-pastel-lavender shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-cosmic-text leading-relaxed">
                Tip: stars stay still. Anything that jumps between visits is a
                mover.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function ViewerPage() {
  return (
    <PageTransition>
      <Suspense fallback={<ViewerShimmerSkeleton />}>
        <ViewerContent />
      </Suspense>
    </PageTransition>
  );
}
