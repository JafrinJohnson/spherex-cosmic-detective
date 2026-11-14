// Forwarding re-export to keep backwards-compatibility with all existing imports of @/components/SoundProvider
export {
  AudioProvider as SoundProvider,
  useAudio as useSound,
  type SoundEffect,
} from "@/context/AudioProvider";
