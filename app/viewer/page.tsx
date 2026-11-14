"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Info,
  Lightbulb,
  Layers,
  Share2,
  Link2,
  Code2,
  Download,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Check,
} from "lucide-react";
import { getTargets, getTarget, getFrames, searchSky } from "@/lib/api";
import { formatRA, formatDec } from "@/lib/coords";
import type { Target, TargetMeta } from "@/types";
import type { MotionAnalysisResult } from "@/lib/motion";
import {
  BlinkPlayer,
  type PixelClickEvent,
} from "@/components/viewer/BlinkPlayer";
import { DetectivePanel } from "@/components/viewer/DetectivePanel";
import { SpectrumChart } from "@/components/viewer/SpectrumChart";
import { PageTransition } from "@/components/PageTransition";
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

const QUALITY_FLAG_MEANINGS: Record<string, string> = {
  SATURATED: "Bright star core saturated the detector pixels.",
  COSMIC_RAY: "A cosmic-ray particle hit was subtracted in this frame.",
  SCATTERED_LIGHT: "Mild stray earthshine or moonlight gradient across field.",
  LOW_SNR: "Lower signal-to-noise ratio in this visit.",
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

  // Detective Click-to-Investigate state
  const [investigation, setInvestigation] =
    useState<MotionAnalysisResult | null>(null);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>("");

  // Share, Embed, Quality Flags & Toast state
  const [embedOpen, setEmbedOpen] = useState<boolean>(false);
  const [qualityOpen, setQualityOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const getCanvasPngRef = useRef<(() => string) | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadSkyData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setUnmatchedOfflineSky(false);
    setInvestigation(null);
    setThumbnailDataUrl("");

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
    if (event.analysis) {
      setInvestigation(event.analysis);
      setThumbnailDataUrl(event.thumbnailDataUrl || "");
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    setInvestigation(null);
    setThumbnailDataUrl("");
  }, []);

  const handleCanvasReady = useCallback((getter: () => string) => {
    getCanvasPngRef.current = getter;
  }, []);

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

  const buildShareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams({
      ra: String(displayRa),
      dec: String(displayDec),
      fov: String(fovArcmin),
      band: bandParam,
    });
    if (activeTarget?.id) {
      params.set("target", activeTarget.id);
    }
    return `${window.location.origin}/viewer?${params.toString()}`;
  }, [displayRa, displayDec, fovArcmin, bandParam, activeTarget]);

  const handleCopyLink = async () => {
    playSound("click");
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback if clipboard permission denied
    }
    triggerToast("Link copied");
  };

  const handleDownloadFrame = () => {
    playSound("click");
    const dataUrl = getCanvasPngRef.current?.() ?? "";
    if (!dataUrl) return;
    const frameDate =
      meta?.frames[currentFrameIndex]?.date ?? "2025-06-01";
    const slug = activeTarget?.id || "sky";
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `spherex-${slug}-${frameDate}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Frame downloaded as PNG");
  };

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
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try again</span>
            </button>
            <Link
              href="/explore"
              className="min-h-[44px] inline-flex items-center px-5 py-3 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-cosmic-text border border-white/15"
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
                className="min-h-[44px] glass px-5 py-3 rounded-full text-xs sm:text-sm font-medium text-cosmic-text hover:border-pastel-peach flex items-center gap-2.5 transition-all"
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

  const frames = meta?.frames ?? [];
  const activeFrame = frames[currentFrameIndex] ?? frames[0];
  const pixelScale = meta?.pixelScaleArcsec ?? 6.2;
  const isPlaceholderSource = (meta?.source ?? "placeholder") === "placeholder";
  const qualityFlags = meta?.flags ?? [];
  const shareUrl = buildShareUrl();
  const embedSnippet = `<iframe src="${shareUrl}" width="800" height="600"></iframe>`;

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-16 relative">
      {/* PAGE HEADER */}
      <section className="glass p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              onClick={() => playSound("click")}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 text-pastel-sky transition-colors"
            >
              <span>← Explore</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-pastel-lavender/15 text-pastel-lavender border border-pastel-lavender/35">
              <Layers className="w-3.5 h-3.5" />
              <span>{frames.length} visits</span>
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-medium text-cosmic-text">
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
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${
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

      {/* MAIN TWO-COLUMN LAYOUT: Left = Viewer + Spectrum (flex 2), Right = Detective Panel + Frame Info + Share + Quality (flex 1) */}
      <section className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column (flex 2): BlinkPlayer + Cosmic Fingerprint Spectrum */}
        <div className="w-full lg:flex-[2] min-w-0 space-y-8">
          <BlinkPlayer
            frames={frames}
            pixelScaleArcsec={pixelScale}
            bandLabel={bandLabel}
            centerRa={displayRa}
            centerDec={displayDec}
            currentFrameIndex={currentFrameIndex}
            onFrameIndexChange={setCurrentFrameIndex}
            onImageDimensionsLoaded={handleImageDimensionsLoaded}
            onPixelClick={handlePixelClick}
            investigation={investigation}
            onClearSelection={handleClearSelection}
            onCanvasReady={handleCanvasReady}
          />

          {/* 3. COSMIC FINGERPRINT — SPECTRUM */}
          <SpectrumChart
            targetId={activeTarget?.id || "barnards-star"}
            source={meta?.source ?? "placeholder"}
          />
        </div>

        {/* Right Column (flex 1): Detective Panel, Frame Info, Share & Export, Quality Flags */}
        <aside className="w-full lg:flex-[1] space-y-6">
          {/* 2. DETECTIVE PANEL */}
          <DetectivePanel
            investigation={investigation}
            thumbnailDataUrl={thumbnailDataUrl}
            targetName={
              activeTarget
                ? activeTarget.name
                : `Sky (${displayRa.toFixed(2)}°, ${displayDec.toFixed(2)}°)`
            }
            targetId={activeTarget?.id}
            onClearSelection={handleClearSelection}
          />

          {/* FRAME INFO CARD */}
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
            </dl>

            <div className="p-4 rounded-2xl bg-pastel-lavender/10 border border-pastel-lavender/30 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-pastel-lavender shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-cosmic-text">
                Stars stay still; anything that jumps between visits is a mover.
              </p>
            </div>
          </div>

          {/* 4. SHARE & EXPORT */}
          <div className="glass p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-pastel-sky" />
              <h2 className="font-heading text-lg font-bold text-cosmic-text">
                Share &amp; Export
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-xs font-medium text-cosmic-text flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-sky"
              >
                <Link2 className="w-3.5 h-3.5 text-pastel-sky shrink-0" />
                <span>Copy link</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setEmbedOpen((o) => !o);
                }}
                aria-expanded={embedOpen}
                className={`min-h-[44px] px-3.5 py-2.5 rounded-2xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${
                  embedOpen
                    ? "bg-pastel-lavender/20 border-pastel-lavender text-cosmic-text"
                    : "bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-cosmic-text"
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-pastel-lavender shrink-0" />
                <span>Embed</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadFrame}
                className="min-h-[44px] px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-xs font-medium text-cosmic-text flex items-center justify-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-peach"
              >
                <Download className="w-3.5 h-3.5 text-pastel-peach shrink-0" />
                <span>Download frame</span>
              </button>
            </div>

            {embedOpen && (
              <div className="p-3.5 rounded-2xl bg-[#0B0B1E]/90 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-cosmic-muted">
                  <span>Copyable iframe snippet</span>
                  <button
                    type="button"
                    onClick={async () => {
                      playSound("click");
                      try {
                        await navigator.clipboard.writeText(embedSnippet);
                      } catch {
                        // Ignore
                      }
                      triggerToast("Embed code copied");
                    }}
                    className="text-pastel-sky hover:underline font-medium"
                  >
                    Copy snippet
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-cosmic-text overflow-x-auto whitespace-pre-wrap break-all select-all">
                  {embedSnippet}
                </pre>
              </div>
            )}
          </div>

          {/* 5. QUALITY FLAGS (Small Collapsible Card) */}
          <div className="glass overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                setQualityOpen((q) => !q);
              }}
              aria-expanded={qualityOpen}
              className="w-full min-h-[48px] px-6 py-4 flex items-center justify-between text-left text-sm font-heading font-semibold text-cosmic-text hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-mint"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pastel-mint" />
                <span>Quality flags</span>
              </span>
              {qualityOpen ? (
                <ChevronUp className="w-4 h-4 text-cosmic-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cosmic-muted" />
              )}
            </button>

            {qualityOpen && (
              <div className="px-6 pb-5 pt-2 border-t border-white/10 text-xs text-cosmic-muted space-y-2">
                {qualityFlags.length > 0 ? (
                  <ul className="space-y-2">
                    {qualityFlags.map((flag) => (
                      <li
                        key={flag}
                        className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-0.5"
                      >
                        <span className="font-mono font-semibold text-pastel-peach">
                          {flag}
                        </span>
                        <span className="text-cosmic-text">
                          {QUALITY_FLAG_MEANINGS[flag] ??
                            "Instrument calibration flag noted for this frame."}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-pastel-mint font-medium">
                    No quality warnings for these frames.
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Single small line inside the Viewer footer when meta.source is "placeholder" */}
      {isPlaceholderSource && (
        <footer className="pt-4 border-t border-white/10 text-center text-xs text-cosmic-muted">
          Showing sample data
        </footer>
      )}

      {/* Lightweight Toast Component (bottom-centre, glass, auto-hide 2.5 s) */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 glass px-5 py-3 rounded-full bg-[#0B0B1E]/95 border border-pastel-mint/50 shadow-glass-glow flex items-center gap-2 text-xs sm:text-sm font-medium text-cosmic-text"
          >
            <Check className="w-4 h-4 text-pastel-mint shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
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
