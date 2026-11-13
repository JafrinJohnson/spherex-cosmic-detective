"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Howl } from "howler";
import { Volume2, VolumeX, SlidersHorizontal } from "lucide-react";

type SoundEffect = "click" | "whoosh" | "success";

interface SoundContextValue {
  muted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (val: number) => void;
  playSound: (effect: SoundEffect) => void;
}

const SoundContext = createContext<SoundContextValue>({
  muted: false,
  volume: 0.5,
  toggleMute: () => {},
  setVolume: () => {},
  playSound: () => {},
});

const STORAGE_MUTE_KEY = "cosmic-detective-sound-muted";
const STORAGE_VOL_KEY = "cosmic-detective-sound-volume";

export function useSound() {
  return useContext(SoundContext);
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolumeState] = useState<number>(0.5);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const ambientRef = useRef<Howl | null>(null);
  const effectsRef = useRef<Record<SoundEffect, Howl | null>>({
    click: null,
    whoosh: null,
    success: null,
  });
  const hasInteractedRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);
  const volumeRef = useRef<number>(0.5);

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const savedMute = window.localStorage.getItem(STORAGE_MUTE_KEY);
      const savedVol = window.localStorage.getItem(STORAGE_VOL_KEY);
      if (savedMute !== null) {
        const parsedMute = savedMute === "true";
        setMuted(parsedMute);
        mutedRef.current = parsedMute;
      }
      if (savedVol !== null) {
        const parsedVol = Math.max(0, Math.min(1, parseFloat(savedVol)));
        if (!Number.isNaN(parsedVol)) {
          setVolumeState(parsedVol);
          volumeRef.current = parsedVol;
        }
      }
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Initialize Howler instances safely so missing files never crash
  useEffect(() => {
    const createSafeHowl = (src: string, loop = false, baseScale = 1): Howl | null => {
      try {
        return new Howl({
          src: [src],
          loop,
          preload: true,
          volume: mutedRef.current ? 0 : volumeRef.current * baseScale,
          onloaderror: () => {
            // Silently ignore missing or invalid sound file
          },
          onplayerror: () => {
            // Silently ignore play unlock errors
          },
        });
      } catch {
        return null;
      }
    };

    ambientRef.current = createSafeHowl("/sounds/ambient.mp3", true, 0.35);
    effectsRef.current = {
      click: createSafeHowl("/sounds/click.mp3", false, 0.7),
      whoosh: createSafeHowl("/sounds/whoosh.mp3", false, 0.65),
      success: createSafeHowl("/sounds/success.mp3", false, 0.85),
    };

    return () => {
      try {
        ambientRef.current?.unload();
        Object.values(effectsRef.current).forEach((h) => h?.unload());
      } catch {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Start ambient loop only after the first user click
  useEffect(() => {
    const handleFirstClick = () => {
      if (hasInteractedRef.current) return;
      hasInteractedRef.current = true;
      try {
        if (ambientRef.current && !mutedRef.current && !ambientRef.current.playing()) {
          ambientRef.current.volume(volumeRef.current * 0.35);
          ambientRef.current.play();
        }
      } catch {
        // Never crash if audio fails
      }
    };

    window.addEventListener("click", handleFirstClick, { passive: true });
    return () => window.removeEventListener("click", handleFirstClick);
  }, []);

  // Sync mute and volume changes with Howl instances and localStorage
  useEffect(() => {
    mutedRef.current = muted;
    volumeRef.current = volume;

    try {
      window.localStorage.setItem(STORAGE_MUTE_KEY, String(muted));
      window.localStorage.setItem(STORAGE_VOL_KEY, String(volume));
    } catch {
      // Ignore localStorage write errors
    }

    try {
      const effectiveVol = muted ? 0 : volume;
      if (ambientRef.current) {
        ambientRef.current.volume(effectiveVol * 0.35);
        if (!muted && hasInteractedRef.current && !ambientRef.current.playing()) {
          ambientRef.current.play();
        } else if (muted && ambientRef.current.playing()) {
          ambientRef.current.pause();
        }
      }
      if (effectsRef.current.click) {
        effectsRef.current.click.volume(effectiveVol * 0.7);
      }
      if (effectsRef.current.whoosh) {
        effectsRef.current.whoosh.volume(effectiveVol * 0.65);
      }
      if (effectsRef.current.success) {
        effectsRef.current.success.volume(effectiveVol * 0.85);
      }
    } catch {
      // Ignore audio update errors
    }
  }, [muted, volume]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (clamped > 0 && mutedRef.current) {
      setMuted(false);
    }
  }, []);

  const playSound = useCallback((effect: SoundEffect) => {
    if (mutedRef.current || volumeRef.current <= 0) return;
    try {
      const howl = effectsRef.current[effect];
      if (howl && howl.state() === "loaded") {
        howl.play();
      }
    } catch {
      // Never crash on missing audio file
    }
  }, []);

  return (
    <SoundContext.Provider
      value={{ muted, volume, toggleMute, setVolume, playSound }}
    >
      {children}

      {/* Floating bottom-right sound control */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {panelOpen && (
          <div className="glass px-4 py-2.5 flex items-center gap-3 shadow-glass-glow">
            <span className="text-xs font-medium tracking-wider uppercase text-cosmic-muted">
              Telemetry Audio
            </span>
            <input
              type="range"
              aria-label="Audio volume"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-[#C3B1E1] cursor-pointer h-1.5 bg-white/20 rounded-lg"
            />
            <span className="text-xs font-mono text-cosmic-text w-8 text-right">
              {muted ? "0%" : `${Math.round(volume * 100)}%`}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-label="Toggle volume slider"
          className="glass p-3 text-cosmic-muted hover:text-cosmic-text focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50"
          title="Audio levels"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            toggleMute();
            playSound("click");
          }}
          aria-label={muted ? "Unmute audio" : "Mute audio"}
          className="glass flex items-center gap-2 px-4 py-3 text-xs font-medium tracking-wider uppercase text-cosmic-text hover:border-pastel-lavender/50 focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50"
        >
          {muted || volume === 0 ? (
            <>
              <VolumeX className="w-4 h-4 text-pastel-peach" />
              <span className="hidden sm:inline text-cosmic-muted">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-pastel-mint" />
              <span className="hidden sm:inline">Audio On</span>
            </>
          )}
        </button>
      </div>
    </SoundContext.Provider>
  );
}

