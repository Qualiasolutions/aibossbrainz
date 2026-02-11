"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearAudioUrl,
  isAudioPaused,
  markAudioEnded,
  pauseAudio,
  resumeAudio,
  setAbortController,
  setCurrentAudio,
  stopAllAudio,
  subscribeToAudioChanges,
} from "@/lib/audio-manager";
import type { BotType } from "@/lib/bot-personalities";
import { useCsrf } from "@/hooks/use-csrf";

export type VoicePlayerState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";

export const useVoicePlayer = () => {
  const [state, setState] = useState<VoicePlayerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const currentPlayIdRef = useRef<string | null>(null);
  const { csrfFetch } = useCsrf();

  // Subscribe to global audio state changes
  useEffect(() => {
    const unsubscribe = subscribeToAudioChanges((isPlaying, _source) => {
      // If audio stopped and we were playing, reset our state
      if (!isPlaying && currentPlayIdRef.current !== null) {
        // Audio was stopped externally
        currentPlayIdRef.current = null;
        setState("idle");
      }
    });
    return unsubscribe;
  }, []);

  const stop = useCallback(() => {
    currentPlayIdRef.current = null;
    stopAllAudio();
    setState("idle");
    setError(null);
  }, []);

  const pause = useCallback(() => {
    pauseAudio();
    setState("paused");
  }, []);

  const resume = useCallback(async () => {
    await resumeAudio();
    setState("playing");
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isAudioPaused()) {
      await resume();
    } else if (state === "playing") {
      pause();
    }
  }, [state, pause, resume]);

  const play = useCallback(
    async (text: string, botType: BotType, speed = 1.0, volume = 1.0) => {
      // Stop any currently playing audio globally
      stopAllAudio();

      if (!text.trim()) {
        setError("No text to speak");
        setState("error");
        return;
      }

      // Generate unique ID for this play request
      const playId = `manual-${Date.now()}-${Math.random()}`;
      currentPlayIdRef.current = playId;

      setState("loading");
      setError(null);

      const abortController = new AbortController();
      setAbortController(abortController);

      try {
        const response = await csrfFetch("/api/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, botType }),
          signal: abortController.signal,
        });

        // Check if this play request is still the current one
        if (currentPlayIdRef.current !== playId) {
          return;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error ?? "Failed to generate voice");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Check again if this play request is still current
        if (currentPlayIdRef.current !== playId) {
          URL.revokeObjectURL(audioUrl);
          return;
        }

        const audio = new Audio(audioUrl);

        audio.addEventListener(
          "ended",
          () => {
            if (currentPlayIdRef.current === playId) {
              setState("idle");
              currentPlayIdRef.current = null;
              markAudioEnded();
            }
            clearAudioUrl(audioUrl);
          },
          { once: true },
        );

        audio.addEventListener(
          "error",
          () => {
            if (currentPlayIdRef.current === playId) {
              setState("error");
              setError("Failed to play audio");
              currentPlayIdRef.current = null;
              markAudioEnded();
            }
            clearAudioUrl(audioUrl);
          },
          { once: true },
        );

        // Register with global audio manager
        setCurrentAudio(audio, audioUrl, "manual");

        // Apply playback speed and volume
        audio.playbackRate = speed;
        audio.volume = Math.max(0, Math.min(1, volume));

        setState("playing");
        await audio.play();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (currentPlayIdRef.current === playId) {
            setState("idle");
            currentPlayIdRef.current = null;
          }
          return;
        }
        if (currentPlayIdRef.current === playId) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setState("error");
          currentPlayIdRef.current = null;
        }
      }
    },
    [csrfFetch],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    error,
    play,
    stop,
    pause,
    resume,
    togglePlayPause,
    isLoading: state === "loading",
    isPlaying: state === "playing",
    isPaused: state === "paused",
    isError: state === "error",
  };
};

// Re-export for backwards compatibility
export { stopAllAudio as stopAllVoicePlayback } from "@/lib/audio-manager";
