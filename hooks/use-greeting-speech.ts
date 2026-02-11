"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearAudioUrl,
  markAudioEnded,
  setAbortController,
  setCurrentAudio,
  stopAllAudio,
} from "@/lib/audio-manager";
import type { BotType } from "@/lib/bot-personalities";
import { useCsrf } from "@/hooks/use-csrf";

const SESSION_KEY = "alecci-greeted";

// Greeting messages for each executive
const GREETINGS: Record<BotType, string> = {
  alexandria:
    "Hello! I'm Alexandria Alecci, your Chief Marketing Officer. How can I help you with marketing strategy today?",
  kim: "Hey there! Kim Mylls here, Chief Sales Officer. Ready to help you close some deals?",
  collaborative:
    "Hi! Alexandria and Kim here, ready to help with your marketing and sales needs.",
};

type GreetingState = "idle" | "loading" | "playing" | "completed" | "error";

/**
 * Hook that automatically speaks a greeting when the user first lands on the chat page.
 * Uses ElevenLabs TTS API via the /api/voice endpoint.
 * Only greets once per session (uses sessionStorage).
 */
export function useGreetingSpeech({
  botType,
  enabled = true,
}: {
  botType: BotType;
  enabled?: boolean;
}) {
  const [state, setState] = useState<GreetingState>("idle");
  const hasGreetedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { csrfFetch } = useCsrf();

  const speak = useCallback(
    async (text: string) => {
      setState("loading");

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
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

        if (!response.ok) {
          throw new Error("Failed to generate greeting voice");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        const audio = new Audio(audioUrl);

        audio.addEventListener(
          "ended",
          () => {
            setState("completed");
            markAudioEnded();
            clearAudioUrl(audioUrl);
          },
          { once: true },
        );

        audio.addEventListener(
          "error",
          () => {
            setState("error");
            markAudioEnded();
            clearAudioUrl(audioUrl);
          },
          { once: true },
        );

        // Apply volume and speed settings from localStorage
        const savedVolume = localStorage.getItem("voice-playback-volume");
        const savedSpeed = localStorage.getItem("voice-playback-speed");

        if (savedVolume) {
          const volume = Number.parseInt(savedVolume, 10);
          if (!Number.isNaN(volume) && volume >= 0 && volume <= 100) {
            audio.volume = volume / 100;
          }
        }

        if (savedSpeed) {
          const speed = Number.parseFloat(savedSpeed);
          if (!Number.isNaN(speed) && speed >= 0.5 && speed <= 3) {
            audio.playbackRate = speed;
          }
        }

        // Register with global audio manager
        setCurrentAudio(audio, audioUrl, "greeting");

        setState("playing");
        await audio.play();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setState("idle");
          return;
        }
        setState("error");
      }
    },
    [botType, csrfFetch],
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopAllAudio();
    setState("idle");
  }, []);

  useEffect(() => {
    if (!enabled || hasGreetedRef.current) {
      return;
    }

    // Check sessionStorage to avoid re-greeting on navigation
    if (typeof window !== "undefined") {
      const greeted = sessionStorage.getItem(SESSION_KEY);
      if (greeted) {
        hasGreetedRef.current = true;
        return;
      }
    }

    // Mark as greeted
    hasGreetedRef.current = true;
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, "true");
    }

    // Small delay to ensure page is ready
    const timeoutId = setTimeout(() => {
      const greetingText = GREETINGS[botType];
      speak(greetingText);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [botType, enabled, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    state,
    stop,
    isLoading: state === "loading",
    isPlaying: state === "playing",
    hasCompleted: state === "completed",
  };
}
