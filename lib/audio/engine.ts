// lib/audio/engine.ts
// Cosmic Audio Engine using Howler.js for files and Web Audio for generated signatures.
// Single shared instances created lazily upon first interaction.
// Never throws, never displays an error overlay.

import { Howl } from "howler";
import { playObjectSignature, type SignatureObjectType } from "./signatures";
import { playSpectrumSound, type SpectrumSoundDataPoint } from "./spectrumSound";

export type MusicTrackId = "home" | "ambient" | "training" | "none";
export type SoundEffectId =
  | "click"
  | "whoosh"
  | "success"
  | "wrong"
  | "miss"
  | "levelup"
  | "reveal";

export interface AudioVolumes {
  music: number; // default 0.35
  space: number; // default 0.5 (Space sounds / signatures)
  effects: number; // default 0.6
  masterMuted: boolean; // default false
  reduceSounds: boolean; // default false (music off, effects only)
}

const STORAGE_KEY_VOLUMES = "cosmic-detective-audio-volumes-v2";

export const DEFAULT_VOLUMES: AudioVolumes = {
  music: 0.35,
  space: 0.5,
  effects: 0.6,
  masterMuted: false,
  reduceSounds: false,
};

class CosmicAudioEngine {
  private musicHowls: Record<string, Howl | null> = {
    home: null,
    ambient: null,
    training: null,
  };

  private effectHowls: Record<string, Howl | null> = {
    click: null,
    whoosh: null,
    success: null,
    wrong: null,
    levelup: null,
    reveal: null,
  };

  private currentMusicId: MusicTrackId = "none";
  private currentHowl: Howl | null = null;
  private targetTrackId: MusicTrackId = "none";

  private volumes: AudioVolumes = { ...DEFAULT_VOLUMES };
  private userHasInteracted = false;
  private isDucked = false;
  private duckTimer: number | null = null;
  private isPageHidden = false;

  constructor() {
    this.loadPersistedSettings();
    if (typeof window !== "undefined") {
      this.attachVisibilityListener();
    }
  }

  private loadPersistedSettings() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_VOLUMES);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.volumes = {
          music: typeof parsed.music === "number" ? Math.max(0, Math.min(1, parsed.music)) : DEFAULT_VOLUMES.music,
          space: typeof parsed.space === "number" ? Math.max(0, Math.min(1, parsed.space)) : DEFAULT_VOLUMES.space,
          effects: typeof parsed.effects === "number" ? Math.max(0, Math.min(1, parsed.effects)) : DEFAULT_VOLUMES.effects,
          masterMuted: Boolean(parsed.masterMuted),
          reduceSounds: Boolean(parsed.reduceSounds),
        };
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveSettings() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_VOLUMES, JSON.stringify(this.volumes));
    } catch {
      // Ignore storage errors
    }
  }

  private attachVisibilityListener() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      this.isPageHidden = document.hidden;
      if (this.isPageHidden) {
        this.pauseAllAudio();
      } else {
        this.resumeActiveAudio();
      }
    });
  }

  public registerUserInteraction() {
    if (this.userHasInteracted) return;
    this.userHasInteracted = true;
    if (this.targetTrackId !== "none" && this.targetTrackId !== this.currentMusicId) {
      this.playMusic(this.targetTrackId);
    }
  }

  private getOrCreateMusicHowl(id: "home" | "ambient" | "training"): Howl | null {
    if (typeof window === "undefined") return null;
    if (this.musicHowls[id]) return this.musicHowls[id];

    const srcMap: Record<string, string> = {
      home: "/audio/home-theme.mp3",
      ambient: "/sounds/ambient.mp3",
      training: "/audio/game-loop.mp3",
    };

    try {
      const howl = new Howl({
        src: [srcMap[id]],
        loop: true,
        html5: false,
        preload: true,
        volume: 0,
        onloaderror: () => {},
        onplayerror: () => {},
      });
      this.musicHowls[id] = howl;
      return howl;
    } catch {
      return null;
    }
  }

  private getOrCreateEffectHowl(id: string): Howl | null {
    if (typeof window === "undefined") return null;
    if (this.effectHowls[id]) return this.effectHowls[id];

    const srcMap: Record<string, string> = {
      click: "/sounds/click.mp3",
      whoosh: "/sounds/whoosh.mp3",
      success: "/sounds/success.mp3",
      wrong: "/sounds/wrong.mp3",
      levelup: "/sounds/levelup.mp3",
      reveal: "/sounds/reveal.mp3",
    };

    if (!srcMap[id]) return null;

    try {
      const howl = new Howl({
        src: [srcMap[id]],
        loop: false,
        preload: true,
        volume: this.getEffectiveEffectVolume(),
        onloaderror: () => {},
        onplayerror: () => {},
      });
      this.effectHowls[id] = howl;
      return howl;
    } catch {
      return null;
    }
  }

  public getEffectiveMusicVolume(trackId: MusicTrackId): number {
    if (this.volumes.masterMuted || this.volumes.reduceSounds || trackId === "none") {
      return 0;
    }
    // Explore/Viewer/Candidates/About/Profile use ambient.mp3 at 40% of music volume
    const trackScale = trackId === "ambient" ? 0.4 : 1.0;
    const duckScale = this.isDucked ? 0.4 : 1.0;
    return this.volumes.music * trackScale * duckScale;
  }

  public getEffectiveSpaceVolume(): number {
    if (this.volumes.masterMuted || this.volumes.reduceSounds) return 0;
    return this.volumes.space;
  }

  public getEffectiveEffectVolume(): number {
    if (this.volumes.masterMuted) return 0;
    return this.volumes.effects;
  }

  public playMusic(trackId: MusicTrackId) {
    this.targetTrackId = trackId;
    if (!this.userHasInteracted || this.isPageHidden) return;

    if (trackId === this.currentMusicId) {
      // Already active, just ensure correct volume
      if (this.currentHowl) {
        const targetVol = this.getEffectiveMusicVolume(trackId);
        this.currentHowl.volume(targetVol);
        if (targetVol > 0 && !this.currentHowl.playing()) {
          this.currentHowl.play();
        }
      }
      return;
    }

    // Crossfade 1.5 s between pages (or 2 s fade-in for home)
    const fadeDurationMs = trackId === "home" ? 2000 : 1500;
    const oldHowl = this.currentHowl;

    if (oldHowl && oldHowl.playing()) {
      try {
        oldHowl.fade(oldHowl.volume(), 0, 1500);
        window.setTimeout(() => {
          if (this.currentHowl !== oldHowl) {
            oldHowl.pause();
          }
        }, 1500);
      } catch {}
    }

    if (trackId === "none") {
      this.currentMusicId = "none";
      this.currentHowl = null;
      return;
    }

    const nextHowl = this.getOrCreateMusicHowl(trackId);
    if (!nextHowl) {
      this.currentMusicId = trackId;
      this.currentHowl = null;
      return;
    }

    try {
      this.currentMusicId = trackId;
      this.currentHowl = nextHowl;

      const targetVol = this.getEffectiveMusicVolume(trackId);
      nextHowl.volume(0);
      nextHowl.play();
      if (targetVol > 0) {
        nextHowl.fade(0, targetVol, fadeDurationMs);
      }
    } catch {}
  }

  public playEffect(effect: SoundEffectId) {
    this.registerUserInteraction();
    if (this.volumes.masterMuted) return;

    // Normalise "miss" to "wrong"
    const effectKey = effect === "miss" ? "wrong" : effect;

    // Trigger music ducking to 40% for 3s on reveal or levelup
    if (effectKey === "reveal" || effectKey === "levelup") {
      this.triggerMusicDuck(3000);
    }

    const howl = this.getOrCreateEffectHowl(effectKey);
    if (!howl) return;

    try {
      const vol = this.getEffectiveEffectVolume();
      howl.volume(vol);
      howl.play();
    } catch {}
  }

  public playSignature(type: SignatureObjectType) {
    this.registerUserInteraction();
    const effectiveSpaceVol = this.getEffectiveSpaceVolume();
    if (effectiveSpaceVol <= 0) return;
    try {
      playObjectSignature(type, effectiveSpaceVol);
    } catch {}
  }

  public playSpectrum(
    data: SpectrumSoundDataPoint[],
    onProgress?: (progress: number) => void
  ): () => void {
    this.registerUserInteraction();
    const effectiveSpaceVol = this.getEffectiveSpaceVolume();
    if (effectiveSpaceVol <= 0) {
      onProgress?.(1);
      return () => {};
    }
    try {
      return playSpectrumSound(data, effectiveSpaceVol, onProgress);
    } catch {
      onProgress?.(1);
      return () => {};
    }
  }

  private triggerMusicDuck(durationMs: number) {
    this.isDucked = true;
    if (this.currentHowl && this.currentHowl.playing()) {
      const duckedVol = this.getEffectiveMusicVolume(this.currentMusicId);
      this.currentHowl.fade(this.currentHowl.volume(), duckedVol, 300);
    }

    if (this.duckTimer) {
      window.clearTimeout(this.duckTimer);
    }

    this.duckTimer = window.setTimeout(() => {
      this.isDucked = false;
      if (this.currentHowl && this.currentHowl.playing()) {
        const normalVol = this.getEffectiveMusicVolume(this.currentMusicId);
        this.currentHowl.fade(this.currentHowl.volume(), normalVol, 600);
      }
    }, durationMs);
  }

  private pauseAllAudio() {
    try {
      if (this.currentHowl && this.currentHowl.playing()) {
        this.currentHowl.pause();
      }
    } catch {}
  }

  private resumeActiveAudio() {
    if (this.volumes.masterMuted || this.volumes.reduceSounds) return;
    if (this.currentHowl && this.targetTrackId !== "none" && !this.currentHowl.playing()) {
      try {
        const targetVol = this.getEffectiveMusicVolume(this.currentMusicId);
        this.currentHowl.volume(targetVol);
        this.currentHowl.play();
      } catch {}
    }
  }

  public updateVolumes(partial: Partial<AudioVolumes>) {
    this.volumes = { ...this.volumes, ...partial };
    this.saveSettings();

    // Reapply to current playing track
    if (this.currentHowl) {
      const targetVol = this.getEffectiveMusicVolume(this.currentMusicId);
      if (targetVol <= 0) {
        if (this.currentHowl.playing()) this.currentHowl.pause();
      } else {
        this.currentHowl.volume(targetVol);
        if (!this.currentHowl.playing() && !this.isPageHidden && this.userHasInteracted) {
          this.currentHowl.play();
        }
      }
    }
  }

  public getVolumes(): AudioVolumes {
    return { ...this.volumes };
  }
}

// Singleton audio engine instance (browser only)
let engineInstance: CosmicAudioEngine | null = null;

export function getAudioEngine(): CosmicAudioEngine {
  if (!engineInstance) {
    engineInstance = new CosmicAudioEngine();
  }
  return engineInstance;
}
