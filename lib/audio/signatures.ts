// lib/audio/signatures.ts
// Web Audio API synthesizers for 3-second gentle object signatures.
// All nodes disconnect cleanly after playing to prevent memory leaks.

export type SignatureObjectType =
  | "sun"
  | "mercury"
  | "venus"
  | "earth"
  | "moon"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto"
  | "dwarf-planet"
  | "asteroid"
  | "comet"
  | "brown-dwarf"
  | "red-dwarf"
  | "variable-star"
  | string;

let sharedAudioCtx: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function playObjectSignature(
  rawType: SignatureObjectType,
  masterGainValue = 0.5
): void {
  const ctx = getSharedAudioContext();
  if (!ctx || masterGainValue <= 0) return;

  const type = (rawType || "").toLowerCase().trim();
  const now = ctx.currentTime;
  const duration = 3.0;

  // Master output gain for this signature
  const outGain = ctx.createGain();
  outGain.gain.setValueAtTime(0, now);
  outGain.gain.linearRampToValueAtTime(masterGainValue * 0.85, now + 0.15);
  outGain.gain.setValueAtTime(masterGainValue * 0.85, now + duration - 0.4);
  outGain.gain.linearRampToValueAtTime(0.0001, now + duration);
  outGain.connect(ctx.destination);

  // Auto-disconnect outGain after 3.2s
  window.setTimeout(() => {
    try {
      outGain.disconnect();
    } catch {
      // Disconnect safely
    }
  }, (duration + 0.3) * 1000);

  // 1. Sun = low rumble swell
  if (type === "sun") {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(45, now);
    osc1.frequency.linearRampToValueAtTime(65, now + 1.5);
    osc1.frequency.linearRampToValueAtTime(42, now + duration);

    osc2.frequency.setValueAtTime(90, now);
    osc2.frequency.linearRampToValueAtTime(130, now + 1.5);
    osc2.frequency.linearRampToValueAtTime(85, now + duration);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.linearRampToValueAtTime(260, now + 1.5);
    filter.frequency.linearRampToValueAtTime(110, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(outGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    return;
  }

  // 2. Mercury = quick high pings
  if (type === "mercury") {
    const freqs = [880, 1174, 1480, 1760, 2093];
    freqs.forEach((f, i) => {
      const pingTime = now + i * 0.45;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, pingTime);

      gain.gain.setValueAtTime(0, pingTime);
      gain.gain.linearRampToValueAtTime(0.4, pingTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, pingTime + 0.35);

      osc.connect(gain);
      gain.connect(outGain);

      osc.start(pingTime);
      osc.stop(pingTime + 0.4);
    });
    return;
  }

  // 3. Venus = warm hiss
  if (type === "venus") {
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, now);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.linearRampToValueAtTime(480, now + 1.5);
    filter.frequency.linearRampToValueAtTime(300, now + duration);
    filter.Q.setValueAtTime(3, now);

    osc.connect(filter);
    filter.connect(outGain);
    osc.start(now);
    osc.stop(now + duration);
    return;
  }

  // 4. Earth = soft rising chirps
  if (type === "earth") {
    [0, 0.7, 1.4].forEach((offset) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);

      osc.connect(gain);
      gain.connect(outGain);
      osc.start(t);
      osc.stop(t + 0.65);
    });
    return;
  }

  // 5. Moon = single bell
  if (type === "moon") {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc2.frequency.setValueAtTime(1046.5, now); // C6 overtone

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(outGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    return;
  }

  // 6. Mars = dusty wind
  if (type === "mars") {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(180, now + 1.2);
    osc.frequency.linearRampToValueAtTime(100, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(240, now);
    filter.frequency.linearRampToValueAtTime(420, now + 1.5);
    filter.frequency.linearRampToValueAtTime(200, now + duration);
    filter.Q.setValueAtTime(1.8, now);

    osc.connect(filter);
    filter.connect(outGain);
    osc.start(now);
    osc.stop(now + duration);
    return;
  }

  // 7. Jupiter = descending whistle
  if (type === "jupiter") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 2.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);

    osc.connect(gain);
    gain.connect(outGain);
    osc.start(now);
    osc.stop(now + 2.8);
    return;
  }

  // 8. Saturn = bell chirps with long echo
  if (type === "saturn") {
    [0, 0.4, 0.8].forEach((offset, idx) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25 * (1 + idx * 0.25), t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

      osc.connect(gain);
      gain.connect(outGain);
      osc.start(t);
      osc.stop(t + 2.0);
    });
    return;
  }

  // 9. Uranus / Neptune = icy glass tones
  if (type === "uranus" || type === "neptune") {
    const freqs = type === "uranus" ? [784, 1174, 1568] : [659, 987, 1318];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      osc.connect(gain);
      gain.connect(outGain);
      osc.start(now);
      osc.stop(now + duration);
    });
    return;
  }

  // 10. Dwarf planets / Pluto = lonely crystalline pings
  if (
    type === "pluto" ||
    type === "dwarf-planet" ||
    type.includes("dwarf") && !type.includes("brown") && !type.includes("red")
  ) {
    [0, 0.8, 1.6].forEach((offset, i) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1318.5 * (1 + i * 0.3), t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

      osc.connect(gain);
      gain.connect(outGain);
      osc.start(t);
      osc.stop(t + 1.0);
    });
    return;
  }

  // 11. Asteroid = rocky clicks + low thud
  if (type === "asteroid") {
    // Low thud
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);

    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

    osc.connect(oscGain);
    oscGain.connect(outGain);
    osc.start(now);
    osc.stop(now + 0.55);

    // 3 subtle clicks
    [0.15, 0.35, 0.6].forEach((offset) => {
      const t = now + offset;
      const clickOsc = ctx.createOscillator();
      const clickGain = ctx.createGain();
      clickOsc.type = "square";
      clickOsc.frequency.setValueAtTime(600, t);
      clickOsc.frequency.exponentialRampToValueAtTime(150, t + 0.05);

      clickGain.gain.setValueAtTime(0.2, t);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      clickOsc.connect(clickGain);
      clickGain.connect(outGain);
      clickOsc.start(t);
      clickOsc.stop(t + 0.07);
    });
    return;
  }

  // 12. Comet = icy whoosh with sparkles
  if (type === "comet") {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.linearRampToValueAtTime(880, now + 1.5);
    osc.frequency.linearRampToValueAtTime(440, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(outGain);
    osc.start(now);
    osc.stop(now + duration);

    // Sparkles
    [0.4, 0.9, 1.4, 1.9].forEach((offset, idx) => {
      const t = now + offset;
      const sOsc = ctx.createOscillator();
      const sGain = ctx.createGain();
      sOsc.type = "sine";
      sOsc.frequency.setValueAtTime(1200 + idx * 300, t);
      sGain.gain.setValueAtTime(0.2, t);
      sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      sOsc.connect(sGain);
      sGain.connect(outGain);
      sOsc.start(t);
      sOsc.stop(t + 0.3);
    });
    return;
  }

  // 13. Brown dwarf = dim slow hum
  if (type === "brown-dwarf" || type.includes("brown")) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(68, now);
    osc.frequency.linearRampToValueAtTime(82, now + 1.5);
    osc.frequency.linearRampToValueAtTime(65, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(160, now);

    osc.connect(filter);
    filter.connect(outGain);
    osc.start(now);
    osc.stop(now + duration);
    return;
  }

  // 14. Red dwarf = warm pulsing hum
  if (type === "red-dwarf" || type.includes("red")) {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(130, now);
    osc2.frequency.setValueAtTime(134, now); // 4Hz beat pulse

    osc1.connect(outGain);
    osc2.connect(outGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    return;
  }

  // 15. Variable star = tone that swells and fades
  if (type === "variable-star" || type.includes("variable")) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(330, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 1.4);
    gain.gain.linearRampToValueAtTime(0.001, now + 2.9);

    osc.connect(gain);
    gain.connect(outGain);
    osc.start(now);
    osc.stop(now + duration);
    return;
  }

  // Default fallback tone
  const defOsc = ctx.createOscillator();
  defOsc.type = "sine";
  defOsc.frequency.setValueAtTime(440, now);
  defOsc.connect(outGain);
  defOsc.start(now);
  defOsc.stop(now + 1.5);
}
