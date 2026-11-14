"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, SlidersHorizontal, Check } from "lucide-react";
import {
  getAudioEngine,
  type AudioVolumes,
  type SoundEffectId,
  type MusicTrackId,
  DEFAULT_VOLUMES,
} from "@/lib/audio/engine";
import type { SignatureObjectType } from "@/lib/audio/signatures";
import type { SpectrumSoundDataPoint } from "@/lib/audio/spectrumSound";

export type SoundEffect = SoundEffectId;

export interface AudioContextValue {
  // Backwards compatibility with previous useSound()
  muted: boolean;
  volume: number; // maps to effects volume
  toggleMute: () => void;
  setVolume: (val: number) => void;
  playSound: (effect: SoundEffect) => void;

  // Cosmic audio engine extensions
  volumes: AudioVolumes;
  updateVolumes: (partial: Partial<AudioVolumes>) => void;
  playSignature: (type: SignatureObjectType) => void;
  playSpectrum: (
    data: SpectrumSoundDataPoint[],
    onProgress?: (progress: number) => void
  ) => () => void;
  playMusicTrack: (track: MusicTrackId) => void;
}

const AudioContext = createContext<AudioContextValue>({
  muted: false,
  volume: 0.6,
  toggleMute: () => {},
  setVolume: () => {},
  playSound: () => {},
  volumes: DEFAULT_VOLUMES,
  updateVolumes: () => {},
  playSignature: () => {},
  playSpectrum: () => () => {},
  playMusicTrack: () => {},
});

export function useAudio() {
  return useContext(AudioContext);
}

// Backwards-compatible useSound alias
export function useSound() {
  return useContext(AudioContext);
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [volumes, setVolumesState] = useState<AudioVolumes>(DEFAULT_VOLUMES);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const engine = getAudioEngine();
    setVolumesState(engine.getVolumes());

    // Register user interaction on any window click / key
    const onInteract = () => {
      engine.registerUserInteraction();
    };

    window.addEventListener("click", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });
    window.addEventListener("touchstart", onInteract, { passive: true });

    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("touchstart", onInteract);
    };
  }, []);

  // Page music mapping:
  // - Home (/): home-theme.mp3
  // - Explore (/explore), Viewer (/viewer), Candidates (/candidates), About (/about), Profile (/profile): ambient.mp3
  // - Training (/training): game-loop.mp3
  useEffect(() => {
    if (!mounted) return;
    const engine = getAudioEngine();

    let targetTrack: MusicTrackId = "ambient";
    if (pathname === "/") {
      targetTrack = "home";
    } else if (
      pathname?.startsWith("/training") ||
      pathname?.startsWith("/voyage")
    ) {
      targetTrack = "training";
    } else if (
      pathname?.startsWith("/explore") ||
      pathname?.startsWith("/viewer") ||
      pathname?.startsWith("/candidates") ||
      pathname?.startsWith("/about") ||
      pathname?.startsWith("/profile") ||
      pathname?.startsWith("/signin")
    ) {
      targetTrack = "ambient";
    }

    engine.playMusic(targetTrack);
  }, [pathname, mounted]);

  const updateVolumes = useCallback((partial: Partial<AudioVolumes>) => {
    const engine = getAudioEngine();
    engine.updateVolumes(partial);
    setVolumesState(engine.getVolumes());
  }, []);

  const toggleMute = useCallback(() => {
    updateVolumes({ masterMuted: !volumes.masterMuted });
  }, [volumes.masterMuted, updateVolumes]);

  const setVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      updateVolumes({ effects: clamped, masterMuted: false });
    },
    [updateVolumes]
  );

  const playSound = useCallback((effect: SoundEffect) => {
    const engine = getAudioEngine();
    engine.playEffect(effect);
  }, []);

  const playSignature = useCallback((type: SignatureObjectType) => {
    const engine = getAudioEngine();
    engine.playSignature(type);
  }, []);

  const playSpectrum = useCallback(
    (
      data: SpectrumSoundDataPoint[],
      onProgress?: (progress: number) => void
    ) => {
      const engine = getAudioEngine();
      return engine.playSpectrum(data, onProgress);
    },
    []
  );

  const playMusicTrack = useCallback((track: MusicTrackId) => {
    const engine = getAudioEngine();
    engine.playMusic(track);
  }, []);

  const isMuted = volumes.masterMuted;

  return (
    <AudioContext.Provider
      value={{
        muted: isMuted,
        volume: volumes.effects,
        toggleMute,
        setVolume,
        playSound,
        volumes,
        updateVolumes,
        playSignature,
        playSpectrum,
        playMusicTrack,
      }}
    >
      {children}

      {/* Floating Bottom-Right Sound Controls */}
      <aside
        aria-label="Cosmic sound telemetry and controls"
        className="fixed bottom-6 right-6 z-50 flex items-end gap-2.5"
      >
        {panelOpen && (
          <div
            role="dialog"
            aria-label="Audio Levels and Options"
            className="glass p-5 rounded-3xl w-72 sm:w-80 space-y-4 shadow-glass-glow border border-white/20 bg-[#0B0B1E]/95 backdrop-blur-2xl text-xs text-cosmic-text animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-heading font-semibold text-sm text-cosmic-text flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-pastel-lavender" />
                <span>Cosmic Audio Levels</span>
              </span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close audio levels panel"
                className="text-xs text-cosmic-muted hover:text-cosmic-text px-2 py-1"
              >
                Done
              </button>
            </div>

            {/* Slider 1: Music Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="music-volume-slider"
                  className="text-xs text-cosmic-muted"
                >
                  Music
                </label>
                <span className="font-mono text-xs text-pastel-sky">
                  {Math.round(volumes.music * 100)}%
                </span>
              </div>
              <input
                id="music-volume-slider"
                type="range"
                aria-label="Music volume"
                min={0}
                max={1}
                step={0.05}
                disabled={volumes.masterMuted || volumes.reduceSounds}
                value={volumes.music}
                onChange={(e) =>
                  updateVolumes({ music: parseFloat(e.target.value) })
                }
                className="w-full accent-[#A2D2FF] cursor-pointer h-1.5 bg-white/20 rounded-lg disabled:opacity-30"
              />
            </div>

            {/* Slider 2: Space Sounds (Object Signatures & Spectrum) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="space-volume-slider"
                  className="text-xs text-cosmic-muted"
                >
                  Space sounds
                </label>
                <span className="font-mono text-xs text-pastel-mint">
                  {Math.round(volumes.space * 100)}%
                </span>
              </div>
              <input
                id="space-volume-slider"
                type="range"
                aria-label="Space sounds volume"
                min={0}
                max={1}
                step={0.05}
                disabled={volumes.masterMuted || volumes.reduceSounds}
                value={volumes.space}
                onChange={(e) =>
                  updateVolumes({ space: parseFloat(e.target.value) })
                }
                className="w-full accent-[#B5EAD7] cursor-pointer h-1.5 bg-white/20 rounded-lg disabled:opacity-30"
              />
            </div>

            {/* Slider 3: UI Effects */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="effects-volume-slider"
                  className="text-xs text-cosmic-muted"
                >
                  Effects
                </label>
                <span className="font-mono text-xs text-pastel-peach">
                  {Math.round(volumes.effects * 100)}%
                </span>
              </div>
              <input
                id="effects-volume-slider"
                type="range"
                aria-label="Effects volume"
                min={0}
                max={1}
                step={0.05}
                disabled={volumes.masterMuted}
                value={volumes.effects}
                onChange={(e) =>
                  updateVolumes({ effects: parseFloat(e.target.value) })
                }
                className="w-full accent-[#FFB5A7] cursor-pointer h-1.5 bg-white/20 rounded-lg disabled:opacity-30"
              />
            </div>

            {/* Option: Reduce Sounds (Music off, effects only) */}
            <div className="pt-2 border-t border-white/10">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={volumes.reduceSounds}
                  onChange={(e) =>
                    updateVolumes({ reduceSounds: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-[#C3B1E1] cursor-pointer"
                />
                <span className="text-cosmic-muted hover:text-cosmic-text">
                  Reduce sounds (music off, effects only)
                </span>
              </label>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            playSound("click");
            setPanelOpen((o) => !o);
          }}
          aria-expanded={panelOpen}
          aria-label="Toggle cosmic audio levels panel"
          className="glass min-h-[44px] min-w-[44px] p-3 text-cosmic-muted hover:text-cosmic-text focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 transition-colors"
          title="Audio levels and options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            toggleMute();
            playSound("click");
          }}
          aria-label={isMuted ? "Unmute cosmic audio" : "Mute cosmic audio"}
          className="glass min-h-[44px] flex items-center gap-2 px-4 py-3 text-xs font-semibold tracking-wider uppercase text-cosmic-text hover:border-pastel-lavender/50 focus:outline-none focus:ring-2 focus:ring-pastel-lavender/50 transition-all"
        >
          {isMuted ? (
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
      </aside>
    </AudioContext.Provider>
  );
}
