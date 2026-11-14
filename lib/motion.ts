import type { DetectiveVerdict, FrameEntry } from "@/types";

export interface FrameCentroid {
  frameIndex: number;
  x: number;
  y: number;
  brightness: number;
  peakLum: number;
}

export interface MotionAnalysisResult {
  found: boolean;
  message?: string;
  verdict?: DetectiveVerdict;
  clickedX: number;
  clickedY: number;
  clickedFrameIndex: number;
  centroids: FrameCentroid[];
  displacementPx: number;
  displacementArcsec: number;
  speedArcsecPerDay: number;
  directionAngleDeg: number;
  directionWords: string;
  brightnessChangePct: number;
  approxRa: number;
  approxDec: number;
}

function getLuminanceAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  const idx = (y * width + x) * 4;
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

/**
 * Finds the brightest blob inside a search radius of 8 px around (searchX, searchY)
 * and computes its brightness-weighted centroid (x, y) and total brightness.
 */
function findBrightestBlobInRadius(
  imgData: ImageData,
  searchX: number,
  searchY: number,
  radius = 8
): { found: boolean; x: number; y: number; brightness: number; peakLum: number } {
  const { width, height, data } = imgData;
  const r2 = radius * radius;

  const x0 = Math.max(0, Math.floor(searchX - radius));
  const x1 = Math.min(width - 1, Math.ceil(searchX + radius));
  const y0 = Math.max(0, Math.floor(searchY - radius));
  const y1 = Math.min(height - 1, Math.ceil(searchY + radius));

  const samples: number[] = [];
  let peakLum = -1;
  let peakX = searchX;
  let peakY = searchY;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - searchX;
      const dy = y - searchY;
      if (dx * dx + dy * dy <= r2) {
        const lum = getLuminanceAt(data, width, x, y);
        samples.push(lum);
        if (lum > peakLum) {
          peakLum = lum;
          peakX = x;
          peakY = y;
        }
      }
    }
  }

  if (samples.length === 0) {
    return { found: false, x: searchX, y: searchY, brightness: 0, peakLum: 0 };
  }

  // Estimate local sky background as the 25th percentile inside the 8px aperture
  samples.sort((a, b) => a - b);
  const bgLum = samples[Math.floor(samples.length * 0.25)] ?? 0;
  const netPeak = peakLum - bgLum;

  // Require a distinct star/source above background sky noise
  if (netPeak < 24) {
    return { found: false, x: searchX, y: searchY, brightness: 0, peakLum };
  }

  // Compute brightness-weighted centroid around the peak within the 8px search region
  let sumW = 0;
  let sumWX = 0;
  let sumWY = 0;
  const blobRadius2 = 6.5 * 6.5;
  const threshold = bgLum + Math.max(8, netPeak * 0.18);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dxSearch = x - searchX;
      const dySearch = y - searchY;
      const dxPeak = x - peakX;
      const dyPeak = y - peakY;

      if (
        dxSearch * dxSearch + dySearch * dySearch <= r2 &&
        dxPeak * dxPeak + dyPeak * dyPeak <= blobRadius2
      ) {
        const lum = getLuminanceAt(data, width, x, y);
        if (lum > threshold) {
          const weight = lum - bgLum;
          sumW += weight;
          sumWX += x * weight;
          sumWY += y * weight;
        }
      }
    }
  }

  if (sumW <= 0) {
    return { found: false, x: searchX, y: searchY, brightness: 0, peakLum };
  }

  return {
    found: true,
    x: sumWX / sumW,
    y: sumWY / sumW,
    brightness: sumW,
    peakLum,
  };
}

function describeDirectionWords(dx: number, dy: number, displacementPx: number): string {
  if (displacementPx <= 0.4) {
    return "stationary";
  }
  // Note: in image/canvas coordinates, +x is right, -y is up
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  const horiz = dx > 0 ? "to the right" : "to the left";
  const vert = dy < 0 ? "up" : "down";

  if (absY > absX * 2.4) {
    return `straight ${vert}`;
  }
  if (absX > absY * 2.4) {
    return horiz;
  }
  return `${vert} and ${horiz}`;
}

export function analyzeClickedPoint({
  framesData,
  framesMeta,
  clickX,
  clickY,
  clickedFrameIndex,
  pixelScaleArcsec,
  centerRa,
  centerDec,
}: {
  framesData: ImageData[];
  framesMeta: FrameEntry[];
  clickX: number;
  clickY: number;
  clickedFrameIndex: number;
  pixelScaleArcsec: number;
  centerRa: number;
  centerDec: number;
}): MotionAnalysisResult {
  if (!framesData || framesData.length === 0) {
    return {
      found: false,
      message: "Nothing bright here. Try clicking right on a dot.",
      clickedX: clickX,
      clickedY: clickY,
      clickedFrameIndex,
      centroids: [],
      displacementPx: 0,
      displacementArcsec: 0,
      speedArcsecPerDay: 0,
      directionAngleDeg: 0,
      directionWords: "stationary",
      brightnessChangePct: 0,
      approxRa: centerRa,
      approxDec: centerDec,
    };
  }

  const safeStartIdx = Math.max(
    0,
    Math.min(framesData.length - 1, clickedFrameIndex)
  );

  // First check the clicked frame within 8 px of (clickX, clickY)
  const initialBlob = findBrightestBlobInRadius(
    framesData[safeStartIdx],
    clickX,
    clickY,
    8
  );

  if (!initialBlob.found) {
    return {
      found: false,
      message: "Nothing bright here. Try clicking right on a dot.",
      clickedX: clickX,
      clickedY: clickY,
      clickedFrameIndex: safeStartIdx,
      centroids: [],
      displacementPx: 0,
      displacementArcsec: 0,
      speedArcsecPerDay: 0,
      directionAngleDeg: 0,
      directionWords: "stationary",
      brightnessChangePct: 0,
      approxRa: centerRa,
      approxDec: centerDec,
    };
  }

  // Find centroids across every frame within 8 px radius
  const centroids: FrameCentroid[] = new Array(framesData.length);
  centroids[safeStartIdx] = {
    frameIndex: safeStartIdx,
    x: initialBlob.x,
    y: initialBlob.y,
    brightness: initialBlob.brightness,
    peakLum: initialBlob.peakLum,
  };

  // Search forward from clickedFrameIndex
  let refX = initialBlob.x;
  let refY = initialBlob.y;
  for (let f = safeStartIdx + 1; f < framesData.length; f++) {
    // Search 8px around click first; if mover stepped slightly, also check 8px from previous centroid
    const fromClick = findBrightestBlobInRadius(framesData[f], clickX, clickY, 8);
    const fromPrev = findBrightestBlobInRadius(framesData[f], refX, refY, 8);
    const chosen =
      fromPrev.found && fromPrev.peakLum >= fromClick.peakLum
        ? fromPrev
        : fromClick;

    if (chosen.found) {
      centroids[f] = {
        frameIndex: f,
        x: chosen.x,
        y: chosen.y,
        brightness: chosen.brightness,
        peakLum: chosen.peakLum,
      };
      refX = chosen.x;
      refY = chosen.y;
    } else {
      centroids[f] = {
        frameIndex: f,
        x: refX,
        y: refY,
        brightness: initialBlob.brightness,
        peakLum: initialBlob.peakLum,
      };
    }
  }

  // Search backward from clickedFrameIndex
  refX = initialBlob.x;
  refY = initialBlob.y;
  for (let f = safeStartIdx - 1; f >= 0; f--) {
    const fromClick = findBrightestBlobInRadius(framesData[f], clickX, clickY, 8);
    const fromPrev = findBrightestBlobInRadius(framesData[f], refX, refY, 8);
    const chosen =
      fromPrev.found && fromPrev.peakLum >= fromClick.peakLum
        ? fromPrev
        : fromClick;

    if (chosen.found) {
      centroids[f] = {
        frameIndex: f,
        x: chosen.x,
        y: chosen.y,
        brightness: chosen.brightness,
        peakLum: chosen.peakLum,
      };
      refX = chosen.x;
      refY = chosen.y;
    } else {
      centroids[f] = {
        frameIndex: f,
        x: refX,
        y: refY,
        brightness: initialBlob.brightness,
        peakLum: initialBlob.peakLum,
      };
    }
  }

  const first = centroids[0];
  const last = centroids[centroids.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const displacementPx = Number(Math.hypot(dx, dy).toFixed(2));
  const displacementArcsec = Number(
    (displacementPx * (pixelScaleArcsec || 6.2)).toFixed(2)
  );

  // Direction angle in screen degrees (0° = right, -45° = up-right, +90° = down)
  const directionAngleDeg = Number(
    ((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)
  );
  const directionWords = describeDirectionWords(dx, dy, displacementPx);

  // Speed in arcsec per day from frame dates
  let totalDays = 548; // fallback ~1.5 years
  if (framesMeta.length >= 2) {
    const t0 = Date.parse(framesMeta[0].date);
    const t1 = Date.parse(framesMeta[framesMeta.length - 1].date);
    if (Number.isFinite(t0) && Number.isFinite(t1) && t1 > t0) {
      totalDays = (t1 - t0) / (1000 * 60 * 60 * 24);
    }
  }
  const speedArcsecPerDay = Number(
    (displacementArcsec / Math.max(1, totalDays)).toFixed(4)
  );

  // Brightness change in % between faintest and brightest frame
  const brightnessValues = centroids.map((c) => c.brightness).filter((b) => b > 0);
  const minB = brightnessValues.length > 0 ? Math.min(...brightnessValues) : 1;
  const maxB = brightnessValues.length > 0 ? Math.max(...brightnessValues) : 1;
  const brightnessChangePct = Number(
    (((maxB - minB) / Math.max(1, minB)) * 100).toFixed(1)
  );

  // Classification rule:
  // moved > 1 px -> "Mover"; else brightness change > 20% -> "Changing brightness"; else "Still star"
  let verdict: DetectiveVerdict = "Still star";
  if (displacementPx > 1.0) {
    verdict = "Mover";
  } else if (brightnessChangePct > 20.0) {
    verdict = "Changing brightness";
  }

  // Approximate RA/Dec offset from image centre using pixelScaleArcsec
  const imgW = framesData[0].width || 512;
  const imgH = framesData[0].height || 512;
  const currentCentroid = centroids[safeStartIdx];
  const dPxX = currentCentroid.x - imgW / 2;
  const dPxY = imgH / 2 - currentCentroid.y; // +North is up (-y)
  const degPerPx = (pixelScaleArcsec || 6.2) / 3600;
  const cosDec = Math.max(0.1, Math.cos((centerDec * Math.PI) / 180));

  const approxRa = Number((centerRa - (dPxX * degPerPx) / cosDec).toFixed(5));
  const approxDec = Number(
    Math.max(-90, Math.min(90, centerDec + dPxY * degPerPx)).toFixed(5)
  );

  return {
    found: true,
    verdict,
    clickedX: Math.round(currentCentroid.x),
    clickedY: Math.round(currentCentroid.y),
    clickedFrameIndex: safeStartIdx,
    centroids,
    displacementPx,
    displacementArcsec,
    speedArcsecPerDay,
    directionAngleDeg,
    directionWords,
    brightnessChangePct,
    approxRa,
    approxDec,
  };
}

/**
 * Generates a 128x128 PNG dataURL thumbnail cropped around (centerX, centerY)
 * from the given ImageData frame, with a subtle target ring.
 */
export function createThumbnailCropDataUrl(
  imgData: ImageData,
  centerX: number,
  centerY: number,
  outputSize = 128
): string {
  if (typeof document === "undefined") return "";
  try {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = imgData.width;
    sourceCanvas.height = imgData.height;
    const sCtx = sourceCanvas.getContext("2d");
    if (!sCtx) return "";
    sCtx.putImageData(imgData, 0, 0);

    const cropRadius = 28; // 56x56 px source region scaled to 128x128
    const sx = Math.max(
      0,
      Math.min(imgData.width - cropRadius * 2, Math.round(centerX - cropRadius))
    );
    const sy = Math.max(
      0,
      Math.min(imgData.height - cropRadius * 2, Math.round(centerY - cropRadius))
    );

    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = outputSize;
    thumbCanvas.height = outputSize;
    const tCtx = thumbCanvas.getContext("2d");
    if (!tCtx) return "";

    tCtx.fillStyle = "#0B0B1E";
    tCtx.fillRect(0, 0, outputSize, outputSize);
    tCtx.imageSmoothingEnabled = false;
    tCtx.drawImage(
      sourceCanvas,
      sx,
      sy,
      cropRadius * 2,
      cropRadius * 2,
      0,
      0,
      outputSize,
      outputSize
    );

    // Subtle reticle ring at crop center
    tCtx.strokeStyle = "#FFD166";
    tCtx.lineWidth = 2;
    tCtx.beginPath();
    tCtx.arc(outputSize / 2, outputSize / 2, 20, 0, Math.PI * 2);
    tCtx.stroke();

    return thumbCanvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

