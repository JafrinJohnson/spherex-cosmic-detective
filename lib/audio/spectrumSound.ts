// lib/audio/spectrumSound.ts
// Synthesizes the "Sound of the Sky" based on 102-channel spectrophotometry.
// 4-second sweep: wavelength (0.75 -> 5.0 µm) maps to pitch (200 -> 1200 Hz),
// and brightness (flux) maps to volume.
// Calls onProgress(p) so a playhead line can move synchronously.

import { getSharedAudioContext } from "./signatures";

export interface SpectrumSoundDataPoint {
  wavelength: number;
  flux: number;
}

export function playSpectrumSound(
  data: SpectrumSoundDataPoint[],
  masterGainValue = 0.5,
  onProgress?: (progress: number) => void
): () => void {
  const ctx = getSharedAudioContext();
  if (!ctx || masterGainValue <= 0 || !data || data.length === 0) {
    onProgress?.(1);
    return () => {};
  }

  const durationSec = 4.0;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";

  // Compute maximum flux to normalize brightness between 0.1 and 1.0
  const maxFlux = Math.max(...data.map((d) => d.flux), 0.001);

  // Sample pitch (200Hz - 1200Hz) and gain based on wavelength and normalized flux
  const sampleCount = Math.min(data.length, 64);
  for (let i = 0; i < sampleCount; i++) {
    const p = i / (sampleCount - 1);
    const timeAt = now + p * durationSec;
    const itemIndex = Math.min(
      Math.floor(p * data.length),
      data.length - 1
    );
    const item = data[itemIndex];
    if (!item) continue;

    // Wavelength 0.75 - 5.0 µm -> 200 Hz to 1200 Hz
    const wl = Math.max(0.75, Math.min(5.0, item.wavelength));
    const normWl = (wl - 0.75) / (5.0 - 0.75);
    const freq = 200 + normWl * 1000;

    // Brightness -> volume
    const brightness = Math.max(0.05, Math.min(1.0, item.flux / maxFlux));
    const targetGain = brightness * masterGainValue * 0.7;

    if (i === 0) {
      osc.frequency.setValueAtTime(freq, timeAt);
      gain.gain.setValueAtTime(0.001, timeAt);
      gain.gain.linearRampToValueAtTime(targetGain, timeAt + 0.1);
    } else {
      osc.frequency.linearRampToValueAtTime(freq, timeAt);
      gain.gain.linearRampToValueAtTime(targetGain, timeAt);
    }
  }

  // Fade out at end
  gain.gain.setValueAtTime(gain.gain.value, now + durationSec - 0.15);
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec);

  // Playhead synchronization loop via requestAnimationFrame
  let rafId = 0;
  const startTime = performance.now();
  const tick = (currentTime: number) => {
    const elapsed = (currentTime - startTime) / 1000;
    const progress = Math.min(1, elapsed / durationSec);
    onProgress?.(progress);
    if (progress < 1) {
      rafId = window.requestAnimationFrame(tick);
    } else {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {
        // Disconnect safely
      }
    }
  };
  rafId = window.requestAnimationFrame(tick);

  // Return cancel function
  return () => {
    window.cancelAnimationFrame(rafId);
    try {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    } catch {
      // Ignore
    }
    onProgress?.(0);
  };
}
