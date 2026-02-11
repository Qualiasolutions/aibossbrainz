import { useCallback, useEffect, useState } from "react";
import { isAudioPlaying, pauseAudio, resumeAudio } from "@/lib/audio-manager";

const STORAGE_KEY = "voice-playback-volume";
const DEFAULT_VOLUME = 80;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

export const VOLUME_PRESETS = [
  { value: 25, label: "25%" },
  { value: 50, label: "50%" },
  { value: 75, label: "75%" },
  { value: 100, label: "100%" },
] as const;

export function useVoiceVolume() {
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Load saved volume from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (
        !Number.isNaN(parsed) &&
        parsed >= MIN_VOLUME &&
        parsed <= MAX_VOLUME
      ) {
        setVolumeState(parsed);
      }
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, newVolume));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toString());
    // Unmute when manually adjusting volume
    if (clamped > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const willBeMuted = !prev;
      // Actually pause/resume audio when muting/unmuting
      if (willBeMuted && isAudioPlaying()) {
        pauseAudio();
      } else if (!willBeMuted) {
        // Resume audio if it was paused by mute
        resumeAudio();
      }
      return willBeMuted;
    });
  }, []);

  // Effective volume (0 if muted, otherwise the set volume)
  const effectiveVolume = isMuted ? 0 : volume;

  // Convert to 0-1 range for audio element
  const volumeLevel = effectiveVolume / 100;

  return {
    volume,
    setVolume,
    isMuted,
    toggleMute,
    effectiveVolume,
    volumeLevel,
    minVolume: MIN_VOLUME,
    maxVolume: MAX_VOLUME,
  };
}
