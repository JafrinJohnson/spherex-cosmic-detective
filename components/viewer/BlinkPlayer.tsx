"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Grid,
  Crosshair,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Keyboard,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { FrameEntry } from "@/types";
import {
  analyzeClickedPoint,
  createThumbnailCropDataUrl,
  type MotionAnalysisResult,
} from "@/lib/motion";
import { useSound } from "@/components/SoundProvider";

export type ViewerMode = "blink" | "difference" | "trail";

export interface PixelClickEvent {
  x: number;
  y: number;
  frameIndex: number;
  analysis?: MotionAnalysisResult;
  thumbnailDataUrl?: string;
}

export interface BlinkPlayerProps {
  frames: FrameEntry[];
  pixelScaleArcsec: number;
  bandLabel: string;
  centerRa?: number;
  centerDec?: number;
  currentFrameIndex: number;
  onFrameIndexChange: (index: number) => void;
  onImageDimensionsLoaded?: (width: number, height: number) => void;
  onPixelClick?: (event: PixelClickEvent) => void;
  investigation?: MotionAnalysisResult | null;
  onClearSelection?: () => void;
  onCanvasReady?: (getPngDataUrl: () => string) => void;
}

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "4×", value: 4 },
];

const BASE_FRAME_MS = 700;

export function BlinkPlayer({
  frames,
  pixelScaleArcsec,
  bandLabel,
  centerRa = 269.4521,
  centerDec = 4.6934,
  currentFrameIndex,
  onFrameIndexChange,
  onImageDimensionsLoaded,
  onPixelClick,
  investigation,
  onClearSelection,
  onCanvasReady,
}: BlinkPlayerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  // Preloading state
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({
    width: 512,
    height: 512,
  });
  const rawFramesDataRef = useRef<ImageData[]>([]);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playback & mode states
  const [mode, setMode] = useState<ViewerMode>("blink");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [loop, setLoop] = useState<boolean>(true);
  const [playProgress, setPlayProgress] = useState<number>(0);

  // Overlays
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(true);

  // Image Adjust (collapsible)
  const [adjustOpen, setAdjustOpen] = useState<boolean>(false);
  const [stretch, setStretch] = useState<number>(0);
  const [smoothPixels, setSmoothPixels] = useState<boolean>(false);
  const [invertColours, setInvertColours] = useState<boolean>(false);

  // Zoom & Pan (1x to 8x)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pointerPixel, setPointerPixel] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Drag/Pinch interaction refs
  const isDraggingRef = useRef<boolean>(false);
  const dragMovedRef = useRef<boolean>(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
  }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const pinchDistanceRef = useRef<number | null>(null);

  // Respect prefers-reduced-motion on mount
  useEffect(() => {
    setIsPlaying(!prefersReducedMotion);
  }, [prefersReducedMotion]);

  // Expose canvas PNG exporter to parent for "Download frame"
  useEffect(() => {
    if (!onCanvasReady) return;
    onCanvasReady(() => {
      try {
        return mainCanvasRef.current?.toDataURL("image/png") ?? "";
      } catch {
        return "";
      }
    });
  }, [onCanvasReady]);

  // Preload all frame images with crossOrigin="anonymous" onto offscreen canvases
  useEffect(() => {
    if (!frames || frames.length === 0) return;
    let cancelled = false;
    setIsReady(false);
    setLoadedCount(0);

    const loadAllFrames = async () => {
      const results: ImageData[] = new Array(frames.length);
      let completed = 0;
      let detectedWidth = 512;
      let detectedHeight = 512;

      await Promise.all(
        frames.map(
          (frame, idx) =>
            new Promise<void>((resolve) => {
              const img = new window.Image();
              img.crossOrigin = "anonymous";
              const src =
                frame.url || `/data/barnards-star/frames/${frame.file}`;

              img.onload = () => {
                if (cancelled) {
                  resolve();
                  return;
                }
                const w = img.naturalWidth || 512;
                const h = img.naturalHeight || 512;
                detectedWidth = w;
                detectedHeight = h;

                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = w;
                tempCanvas.height = h;
                const ctx = tempCanvas.getContext("2d");
                if (ctx) {
                  ctx.drawImage(img, 0, 0, w, h);
                  try {
                    results[idx] = ctx.getImageData(0, 0, w, h);
                  } catch {
                    results[idx] = new ImageData(w, h);
                  }
                }
                completed += 1;
                setLoadedCount(completed);
                resolve();
              };

              img.onerror = () => {
                if (!cancelled) {
                  results[idx] = new ImageData(512, 512);
                  completed += 1;
                  setLoadedCount(completed);
                }
                resolve();
              };

              img.src = src;
            })
        )
      );

      if (cancelled) return;
      rawFramesDataRef.current = results;
      setImgSize({ width: detectedWidth, height: detectedHeight });
      onImageDimensionsLoaded?.(detectedWidth, detectedHeight);
      setIsReady(true);
    };

    loadAllFrames();

    return () => {
      cancelled = true;
    };
  }, [frames, onImageDimensionsLoaded]);

  // Playback loop (hard cut per frame)
  useEffect(() => {
    if (!isReady || !isPlaying || frames.length <= 1) {
      setPlayProgress(0);
      return;
    }

    const intervalMs = BASE_FRAME_MS / speed;
    let startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      if (elapsed >= intervalMs) {
        startTime = now;
        setPlayProgress(0);
        const nextIdx = currentFrameIndex + 1;
        if (nextIdx >= frames.length) {
          if (loop) {
            onFrameIndexChange(0);
          } else {
            setIsPlaying(false);
            return;
          }
        } else {
          onFrameIndexChange(nextIdx);
        }
      } else {
        setPlayProgress(Math.min(1, elapsed / intervalMs));
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [
    isReady,
    isPlaying,
    speed,
    loop,
    frames.length,
    currentFrameIndex,
    onFrameIndexChange,
  ]);

  // Compute processed ImageData for current mode + stretch + invert, then draw with zoom/pan + detective overlays
  useEffect(() => {
    if (!isReady || rawFramesDataRef.current.length === 0) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = imgSize;
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas");
    }
    const offCanvas = offscreenCanvasRef.current;
    if (offCanvas.width !== width || offCanvas.height !== height) {
      offCanvas.width = width;
      offCanvas.height = height;
    }
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return;

    const safeIdx = Math.min(
      Math.max(0, currentFrameIndex),
      rawFramesDataRef.current.length - 1
    );
    const currentRaw = rawFramesDataRef.current[safeIdx];
    const firstRaw =
      safeIdx === 0 && rawFramesDataRef.current.length > 1
        ? rawFramesDataRef.current[rawFramesDataRef.current.length - 1]
        : rawFramesDataRef.current[0];

    const outImage = offCtx.createImageData(width, height);
    const out = outImage.data;
    const totalPixels = width * height;

    const stretchNorm = stretch / 100;
    const contrastGain = Math.pow(2, stretchNorm * 1.65);
    const brightnessOffset = stretchNorm * 28;

    if (mode === "blink") {
      const src = currentRaw.data;
      for (let i = 0; i < totalPixels * 4; i += 4) {
        let r = (src[i] - 24) * contrastGain + 24 + brightnessOffset;
        let g = (src[i + 1] - 24) * contrastGain + 24 + brightnessOffset;
        let b = (src[i + 2] - 24) * contrastGain + 24 + brightnessOffset;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        if (invertColours) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    } else if (mode === "difference") {
      const cur = currentRaw.data;
      const ref = firstRaw.data;
      for (let i = 0; i < totalPixels * 4; i += 4) {
        const curLum =
          0.299 * cur[i] + 0.587 * cur[i + 1] + 0.114 * cur[i + 2];
        const refLum =
          0.299 * ref[i] + 0.587 * ref[i + 1] + 0.114 * ref[i + 2];
        const diff = (curLum - refLum) * contrastGain * 1.45;

        let r = 11;
        let g = 11;
        let b = 30;

        if (diff > 6) {
          const t = Math.min(1, (diff - 6) / 140);
          r = 11 + t * (255 - 11);
          g = 11 + t * (155 - 11);
          b = 30 + t * (105 - 30);
        } else if (diff < -6) {
          const t = Math.min(1, (-diff - 6) / 140);
          r = 11 + t * (162 - 11);
          g = 11 + t * (210 - 11);
          b = 30 + t * (255 - 30);
        } else {
          const ghost = Math.min(28, curLum * 0.12);
          r += ghost * 0.7;
          g += ghost * 0.7;
          b += ghost;
        }

        r = Math.max(0, Math.min(255, r + brightnessOffset * 0.5));
        g = Math.max(0, Math.min(255, g + brightnessOffset * 0.5));
        b = Math.max(0, Math.min(255, b + brightnessOffset * 0.5));

        if (invertColours) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    } else if (mode === "trail") {
      const allFrames = rawFramesDataRef.current;
      const numF = allFrames.length;
      for (let i = 0; i < totalPixels * 4; i += 4) {
        let maxR = 0;
        let maxG = 0;
        let maxB = 0;
        for (let f = 0; f < numF; f++) {
          const d = allFrames[f].data;
          if (d[i] > maxR) maxR = d[i];
          if (d[i + 1] > maxG) maxG = d[i + 1];
          if (d[i + 2] > maxB) maxB = d[i + 2];
        }

        let r = (maxR - 24) * contrastGain + 24 + brightnessOffset;
        let g = (maxG - 24) * contrastGain + 24 + brightnessOffset;
        let b = (maxB - 24) * contrastGain + 24 + brightnessOffset;

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        if (invertColours) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      }
    }

    offCtx.putImageData(outImage, 0, 0);

    // Render onto visible canvas with zoom, pan, and smoothing setting
    ctx.save();
    ctx.fillStyle = invertColours ? "#F4F3FF" : "#0B0B1E";
    ctx.fillRect(0, 0, width, height);

    ctx.imageSmoothingEnabled = smoothPixels;
    const cx = width / 2;
    const cy = height / 2;
    ctx.translate(cx + pan.x, cy + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    ctx.drawImage(offCanvas, 0, 0);

    // Draw Click-to-Investigate overlays on top of the canvas
    if (investigation && investigation.found && investigation.centroids.length > 0) {
      const centroids = investigation.centroids;
      const firstC = centroids[0];
      const lastC = centroids[centroids.length - 1];
      const activeC = centroids[safeIdx] ?? firstC;

      // 1. Glowing arrow from first position to last position (if moved)
      const dist = Math.hypot(lastC.x - firstC.x, lastC.y - firstC.y);
      if (dist > 0.6) {
        ctx.save();
        ctx.shadowColor = "#FF8A65";
        ctx.shadowBlur = 8 / Math.sqrt(zoom);
        ctx.strokeStyle = "#FFD166";
        ctx.lineWidth = Math.max(1.2, 2.2 / zoom);

        ctx.beginPath();
        ctx.moveTo(firstC.x, firstC.y);
        ctx.lineTo(lastC.x, lastC.y);
        ctx.stroke();

        // Arrowhead at lastC pointing along (lastC - firstC)
        const angle = Math.atan2(lastC.y - firstC.y, lastC.x - firstC.x);
        const headLen = Math.max(4.5, 8.5 / Math.sqrt(zoom));
        ctx.fillStyle = "#FFD166";
        ctx.beginPath();
        ctx.moveTo(lastC.x, lastC.y);
        ctx.lineTo(
          lastC.x - headLen * Math.cos(angle - Math.PI / 6),
          lastC.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          lastC.x - headLen * Math.cos(angle + Math.PI / 6),
          lastC.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Small dots at the object's position in each frame
      for (let i = 0; i < centroids.length; i++) {
        const pt = centroids[i];
        ctx.save();
        ctx.fillStyle = i === safeIdx ? "#FFD166" : "#A2D2FF";
        ctx.beginPath();
        ctx.arc(
          pt.x,
          pt.y,
          (i === safeIdx ? 3.2 : 2.2) / Math.sqrt(zoom),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // 3. Glowing ring on the selected object in the current frame
      ctx.save();
      ctx.shadowColor = "#FFD166";
      ctx.shadowBlur = 10 / Math.sqrt(zoom);
      ctx.strokeStyle = "#FFB5A7";
      ctx.lineWidth = Math.max(1.4, 2.4 / zoom);
      ctx.beginPath();
      ctx.arc(activeC.x, activeC.y, 13 / Math.sqrt(zoom), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else if (investigation && !investigation.found) {
      // Subtle dashed circle where the user clicked empty sky
      ctx.save();
      ctx.strokeStyle = "rgba(255, 181, 167, 0.55)";
      ctx.setLineDash([3 / zoom, 3 / zoom]);
      ctx.lineWidth = Math.max(1, 1.5 / zoom);
      ctx.beginPath();
      ctx.arc(
        investigation.clickedX,
        investigation.clickedY,
        9 / Math.sqrt(zoom),
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [
    isReady,
    currentFrameIndex,
    mode,
    stretch,
    smoothPixels,
    invertColours,
    zoom,
    pan,
    imgSize,
    investigation,
  ]);

  // Convert client mouse/touch coordinates to image pixel coordinates (0..width-1)
  const clientToImagePixel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;

      const canvasX = ((clientX - rect.left) / rect.width) * imgSize.width;
      const canvasY = ((clientY - rect.top) / rect.height) * imgSize.height;

      const cx = imgSize.width / 2;
      const cy = imgSize.height / 2;
      const imgX = (canvasX - cx - pan.x) / zoom + cx;
      const imgY = (canvasY - cy - pan.y) / zoom + cy;

      const clampedX = Math.max(
        0,
        Math.min(imgSize.width - 1, Math.round(imgX))
      );
      const clampedY = Math.max(
        0,
        Math.min(imgSize.height - 1, Math.round(imgY))
      );
      return { x: clampedX, y: clampedY };
    },
    [imgSize.width, imgSize.height, pan.x, pan.y, zoom]
  );

  const clampPan = useCallback(
    (px: number, py: number, targetZoom: number) => {
      if (targetZoom <= 1) return { x: 0, y: 0 };
      const maxOffset = ((targetZoom - 1) * imgSize.width) / 2;
      return {
        x: Math.max(-maxOffset, Math.min(maxOffset, px)),
        y: Math.max(-maxOffset, Math.min(maxOffset, py)),
      };
    },
    [imgSize.width]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const nextZoom = Math.max(
      1,
      Math.min(8, Number((zoom * factor).toFixed(2)))
    );
    setZoom(nextZoom);
    setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      pinchDistanceRef.current = Math.hypot(
        pts[0].x - pts[1].x,
        pts[0].y - pts[1].y
      );
      isDraggingRef.current = false;
      return;
    }

    isDraggingRef.current = true;
    dragMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const coords = clientToImagePixel(e.clientX, e.clientY);
    if (coords) setPointerPixel(coords);

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
    }

    if (activePointersRef.current.size === 2 && pinchDistanceRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / pinchDistanceRef.current;
      pinchDistanceRef.current = dist;
      const nextZoom = Math.max(
        1,
        Math.min(8, Number((zoom * ratio).toFixed(2)))
      );
      setZoom(nextZoom);
      setPan((prev) => clampPan(prev.x, prev.y, nextZoom));
      dragMovedRef.current = true;
      return;
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      dragMovedRef.current = true;
    }

    if (zoom > 1 && dragMovedRef.current) {
      const canvas = mainCanvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const scaleRatio = rect ? imgSize.width / rect.width : 1;
      const nextPan = clampPan(
        dragStartRef.current.panX + dx * scaleRatio,
        dragStartRef.current.panY + dy * scaleRatio,
        zoom
      );
      setPan(nextPan);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchDistanceRef.current = null;
    }

    if (isDraggingRef.current && !dragMovedRef.current) {
      const clicked = clientToImagePixel(e.clientX, e.clientY);
      if (clicked && rawFramesDataRef.current.length > 0) {
        playSound("click");
        const analysis = analyzeClickedPoint({
          framesData: rawFramesDataRef.current,
          framesMeta: frames,
          clickX: clicked.x,
          clickY: clicked.y,
          clickedFrameIndex: currentFrameIndex,
          pixelScaleArcsec,
          centerRa,
          centerDec,
        });

        const safeIdx = Math.min(
          Math.max(0, currentFrameIndex),
          rawFramesDataRef.current.length - 1
        );
        const centroid = analysis.centroids[safeIdx];
        const thumbX = centroid ? centroid.x : clicked.x;
        const thumbY = centroid ? centroid.y : clicked.y;
        const thumbnailDataUrl = createThumbnailCropDataUrl(
          rawFramesDataRef.current[safeIdx],
          thumbX,
          thumbY,
          128
        );

        onPixelClick?.({
          x: clicked.x,
          y: clicked.y,
          frameIndex: currentFrameIndex,
          analysis,
          thumbnailDataUrl,
        });
      }
    }
    isDraggingRef.current = false;
  };

  const handleResetView = () => {
    playSound("click");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const stepPrevious = useCallback(() => {
    setIsPlaying(false);
    const prev =
      currentFrameIndex === 0 ? frames.length - 1 : currentFrameIndex - 1;
    onFrameIndexChange(prev);
  }, [currentFrameIndex, frames.length, onFrameIndexChange]);

  const stepNext = useCallback(() => {
    setIsPlaying(false);
    const next = (currentFrameIndex + 1) % Math.max(1, frames.length);
    onFrameIndexChange(next);
  }, [currentFrameIndex, frames.length, onFrameIndexChange]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && !loop && currentFrameIndex === frames.length - 1) {
        onFrameIndexChange(0);
      }
      return !prev;
    });
  }, [loop, currentFrameIndex, frames.length, onFrameIndexChange]);

  // Global keyboard shortcuts: Space = play/pause, Left/Right = prev/next, B/D/T = Blink/Difference/Trail
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        playSound("click");
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        playSound("click");
        stepPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        playSound("click");
        stepNext();
      } else if (e.key === "b" || e.key === "B") {
        playSound("click");
        setMode("blink");
      } else if (e.key === "d" || e.key === "D") {
        playSound("click");
        setMode("difference");
      } else if (e.key === "t" || e.key === "T") {
        playSound("click");
        setMode("trail");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playSound, togglePlay, stepPrevious, stepNext]);

  // Scale bar computed from pixelScaleArcsec
  const scaleBarInfo = useMemo(() => {
    const arcsecPerPxOnScreen = (pixelScaleArcsec || 6.2) / zoom;
    const candidateArcsecs = [15, 30, 60, 120, 300, 600];
    let chosenArcsec = 30;
    for (const cand of candidateArcsecs) {
      const px = cand / arcsecPerPxOnScreen;
      if (px >= 28 && px <= 120) {
        chosenArcsec = cand;
        break;
      }
    }
    const barPx = Math.max(
      28,
      Math.min(120, Math.round(chosenArcsec / arcsecPerPxOnScreen))
    );
    return {
      label: `${chosenArcsec}″`,
      widthPx: barPx,
    };
  }, [pixelScaleArcsec, zoom]);

  const activeFrame = frames[currentFrameIndex] ?? frames[0];

  return (
    <div className="space-y-5">
      {/* Top Bar: Mode Segmented Control + Telescope Overlay Toggles */}
      <div className="glass p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Pastel Segmented Control: Blink | Difference | Trail */}
        <div
          role="tablist"
          aria-label="Image comparison mode"
          className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-full border border-white/10"
        >
          {(
            [
              { id: "blink", label: "Blink", color: "#C3B1E1" },
              { id: "difference", label: "Difference", color: "#FFB5A7" },
              { id: "trail", label: "Trail", color: "#B5EAD7" },
            ] as const
          ).map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  playSound("click");
                  setMode(item.id);
                }}
                style={{
                  backgroundColor: active ? `${item.color}33` : undefined,
                  borderColor: active ? item.color : "transparent",
                }}
                className={`min-h-[44px] px-4 py-1.5 rounded-full text-xs sm:text-sm font-heading font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${
                  active
                    ? "text-cosmic-text shadow-sm"
                    : "text-cosmic-muted hover:text-cosmic-text"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Grid, Crosshair & Clear Selection Toggles (all 44px min) */}
        <div className="flex flex-wrap items-center gap-2">
          {investigation && (
            <button
              type="button"
              onClick={() => {
                playSound("click");
                onClearSelection?.();
              }}
              className="min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-semibold border border-[#FFD166]/60 bg-[#FFD166]/15 text-[#FFD166] hover:bg-[#FFD166]/25 flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD166]"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Clear selection</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playSound("click");
              setShowGrid((g) => !g);
            }}
            aria-pressed={showGrid}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
              showGrid
                ? "bg-pastel-sky/20 border-pastel-sky text-cosmic-text"
                : "bg-white/[0.05] border-white/15 text-cosmic-muted hover:text-cosmic-text"
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Pixel Grid</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playSound("click");
              setShowCrosshair((c) => !c);
            }}
            aria-pressed={showCrosshair}
            className={`min-h-[44px] px-3.5 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
              showCrosshair
                ? "bg-pastel-peach/20 border-pastel-peach text-cosmic-text"
                : "bg-white/[0.05] border-white/15 text-cosmic-muted hover:text-cosmic-text"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Centre Crosshair</span>
          </button>
        </div>
      </div>

      {/* Telescope Frame around the Square Canvas (max 640px) */}
      <div className="glass p-3 sm:p-5 flex flex-col items-center">
        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setPointerPixel(null)}
          className="relative w-full max-w-[640px] aspect-square rounded-2xl overflow-hidden border border-[#FF8A65]/60 shadow-[0_0_32px_-4px_rgba(255,138,101,0.32)] bg-[#0B0B1E] select-none touch-none cursor-crosshair"
        >
          {/* Main HTML5 Canvas */}
          <canvas
            ref={mainCanvasRef}
            width={imgSize.width}
            height={imgSize.height}
            className="w-full h-full block"
          />

          {/* Preloading Progress Overlay */}
          {!isReady && (
            <div className="absolute inset-0 bg-[#0B0B1E]/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20">
              <Sparkles className="w-7 h-7 text-pastel-peach animate-spin" />
              <div className="font-heading text-sm font-semibold text-cosmic-text">
                Loading frames {loadedCount}/{frames.length}
              </div>
              <div className="w-44 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-infrared-gradient transition-all duration-200"
                  style={{
                    width: `${
                      frames.length > 0
                        ? (loadedCount / frames.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Subtle Pixel Grid Overlay */}
          {showGrid && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(195,177,225,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(195,177,225,0.14)_1px,transparent_1px)] bg-[size:32px_32px]"
            />
          )}

          {/* Centre Crosshair Overlay */}
          {showCrosshair && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="w-10 h-10 rounded-full border border-[#FFD166]/55 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF8A65]/80" />
              </div>
              <div className="absolute w-16 h-[1px] bg-[#FFD166]/35" />
              <div className="absolute h-16 w-[1px] bg-[#FFD166]/35" />
            </div>
          )}

          {/* Top-Left Visit Overlay Label */}
          <div className="pointer-events-none absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-[#0B0B1E]/80 backdrop-blur-md border border-white/15 text-xs font-mono text-cosmic-text">
            Visit {currentFrameIndex + 1} of {frames.length} ·{" "}
            {activeFrame?.date ?? "2025-06-01"}
          </div>

          {/* Top-Right Band Overlay Label */}
          <div className="pointer-events-none absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#0B0B1E]/80 backdrop-blur-md border border-white/15 text-xs font-medium text-pastel-peach">
            {bandLabel}
          </div>

          {/* Bottom-Left Scale Bar computed from pixelScaleArcsec */}
          <div className="pointer-events-none absolute bottom-3 left-3 px-3 py-2 rounded-xl bg-[#0B0B1E]/80 backdrop-blur-md border border-white/15 flex flex-col items-start gap-1">
            <span className="text-[11px] font-mono text-cosmic-text">
              {scaleBarInfo.label} ({pixelScaleArcsec}&Prime;/px)
            </span>
            <div
              style={{ width: `${scaleBarInfo.widthPx}px` }}
              className="h-1.5 border-x-2 border-b-2 border-[#FFD166]"
            />
          </div>

          {/* Bottom-Right Pointer Coordinates & Zoom Readout */}
          <div className="pointer-events-none absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-[#0B0B1E]/80 backdrop-blur-md border border-white/15 text-[11px] font-mono text-cosmic-muted flex items-center gap-3">
            <span>
              {pointerPixel
                ? `x: ${pointerPixel.x}, y: ${pointerPixel.y}`
                : investigation
                ? `Selected: ${investigation.clickedX}, ${investigation.clickedY}`
                : "Click any dot to investigate"}
            </span>
            <span className="text-pastel-sky">{zoom.toFixed(1)}×</span>
          </div>
        </div>

        {/* Zoom & Pan Bar directly under the viewport (44px min touch targets) */}
        <div className="w-full max-w-[640px] mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-cosmic-muted">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                const z = Math.max(1, Number((zoom - 0.5).toFixed(1)));
                setZoom(z);
                setPan((p) => clampPan(p.x, p.y, z));
              }}
              aria-label="Zoom out"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cosmic-text flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-cosmic-text px-1">
              Zoom {zoom.toFixed(1)}×
            </span>
            <button
              type="button"
              onClick={() => {
                playSound("click");
                const z = Math.min(8, Number((zoom + 0.5).toFixed(1)));
                setZoom(z);
                setPan((p) => clampPan(p.x, p.y, z));
              }}
              aria-label="Zoom in"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cosmic-text flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-cosmic-muted hover:text-cosmic-text inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset view</span>
            </button>
          </div>

          <span className="text-[11px] text-cosmic-muted">
            {mode === "difference"
              ? "Orange = current position · Blue = Visit 1 position"
              : mode === "trail"
              ? "Trail stacks maximum brightness across all visits"
              : "Click any bright dot to measure its motion"}
          </span>
        </div>
      </div>

      {/* CONTROLS (Glass Bar under the Canvas, 44px touch targets) */}
      <div className="glass p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playSound("click");
                stepPrevious();
              }}
              aria-label="Previous frame"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-cosmic-text flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                togglePlay();
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-semibold text-xs sm:text-sm uppercase tracking-wider bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow flex items-center gap-2 hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-peach"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                stepNext();
              }}
              aria-label="Next frame"
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-cosmic-text flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                setLoop((l) => !l);
              }}
              aria-pressed={loop}
              title={loop ? "Loop enabled" : "Loop disabled"}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender ${
                loop
                  ? "bg-pastel-mint/20 border-pastel-mint text-cosmic-text"
                  : "bg-white/[0.05] border-white/15 text-cosmic-muted"
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>Loop {loop ? "On" : "Off"}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono uppercase text-cosmic-muted mr-1">
              Speed
            </span>
            {SPEED_OPTIONS.map((opt) => {
              const active = speed === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setSpeed(opt.value);
                  }}
                  className={`min-h-[44px] min-w-[48px] px-3 rounded-full text-xs font-mono font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-pastel-sky ${
                    active
                      ? "bg-pastel-sky/25 border-pastel-sky text-cosmic-text"
                      : "bg-white/[0.05] border-white/10 text-cosmic-muted hover:text-cosmic-text"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline: Clickable Pills per Visit with Animated Progress Line */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 rounded-full bg-white/10 pointer-events-none" />
            {frames.length > 1 && (
              <div
                style={{
                  width: `${Math.min(
                    100,
                    ((currentFrameIndex + (isPlaying ? playProgress : 0)) /
                      (frames.length - 1)) *
                      100
                  )}%`,
                }}
                className="absolute top-1/2 left-0 -translate-y-1/2 h-1 rounded-full bg-infrared-gradient pointer-events-none"
              />
            )}

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {frames.map((frame, idx) => {
                const active = currentFrameIndex === idx;
                return (
                  <button
                    key={frame.file + idx}
                    type="button"
                    onClick={() => {
                      playSound("click");
                      setIsPlaying(false);
                      onFrameIndexChange(idx);
                    }}
                    className={`min-h-[48px] px-3 py-2 rounded-2xl border text-left transition-all focus:outline-none focus:ring-2 focus:ring-pastel-peach ${
                      active
                        ? "bg-[#1A1040]/95 border-[#FFD166] text-cosmic-text shadow-infrared-glow"
                        : "bg-[#0B0B1E]/90 border-white/15 text-cosmic-muted hover:text-cosmic-text hover:border-white/30"
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase text-pastel-lavender">
                      Visit {idx + 1}
                    </div>
                    <div className="text-xs font-semibold truncate">
                      {frame.date}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-cosmic-muted">
          <span className="inline-flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-pastel-lavender" />
            <span>Keyboard shortcuts:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10">
              Space = Play/Pause
            </span>
            <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10">
              ←/→ = Frame
            </span>
            <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10">
              B / D / T = Blink / Diff / Trail
            </span>
          </div>
        </div>
      </div>

      {/* Collapsible "Adjust image" Section */}
      <div className="glass overflow-hidden">
        <button
          type="button"
          onClick={() => {
            playSound("click");
            setAdjustOpen((o) => !o);
          }}
          aria-expanded={adjustOpen}
          className="w-full min-h-[48px] px-6 py-4 flex items-center justify-between text-left text-sm font-heading font-semibold text-cosmic-text hover:bg-white/[0.04] transition-colors focus:outline-none focus:ring-2 focus:ring-pastel-lavender"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pastel-peach" />
            <span>Adjust image</span>
          </span>
          {adjustOpen ? (
            <ChevronUp className="w-4 h-4 text-cosmic-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-cosmic-muted" />
          )}
        </button>

        {adjustOpen && (
          <div className="px-6 pb-6 pt-2 border-t border-white/10 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="stretch-slider"
                  className="font-medium text-cosmic-text"
                >
                  Brightness / Contrast Stretch
                </label>
                <span className="font-mono text-pastel-peach">
                  {stretch > 0 ? `+${stretch}%` : `${stretch}%`}
                </span>
              </div>
              <input
                id="stretch-slider"
                type="range"
                min={-50}
                max={100}
                step={5}
                value={stretch}
                onChange={(e) => setStretch(Number(e.target.value))}
                className="w-full accent-[#FFB5A7] cursor-pointer h-2 bg-white/15 rounded-lg"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setSmoothPixels((s) => !s);
                }}
                aria-pressed={smoothPixels}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                  smoothPixels
                    ? "bg-pastel-lavender/25 border-pastel-lavender text-cosmic-text"
                    : "bg-white/[0.06] border-white/15 text-cosmic-text"
                }`}
              >
                {smoothPixels ? "Smooth pixels" : "Sharp pixels"}
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setInvertColours((inv) => !inv);
                }}
                aria-pressed={invertColours}
                className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                  invertColours
                    ? "bg-pastel-peach/25 border-pastel-peach text-cosmic-text"
                    : "bg-white/[0.06] border-white/15 text-cosmic-muted hover:text-cosmic-text"
                }`}
              >
                Invert colours: {invertColours ? "On" : "Off"}
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound("click");
                  setStretch(0);
                  setSmoothPixels(false);
                  setInvertColours(false);
                }}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-cosmic-muted hover:text-cosmic-text"
              >
                Reset Adjustments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
