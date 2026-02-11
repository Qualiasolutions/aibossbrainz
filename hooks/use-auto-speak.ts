"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearAudioUrl,
  markAudioEnded,
  pauseAudio,
  resumeAudio,
  setAbortController,
  setCurrentAudio,
  stopAllAudio,
  subscribeToAudioChanges,
} from "@/lib/audio-manager";
import type { BotType } from "@/lib/bot-personalities";
import type { ChatMessage } from "@/lib/types";
import {
  isVoiceServiceAvailable,
  markVoiceServiceUnavailable,
} from "@/lib/voice/service-status";
import { stripMarkdownForTTS } from "@/lib/voice/strip-markdown-tts";

type AutoSpeakState = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Hook that automatically speaks the latest assistant message when streaming completes.
 * Uses ElevenLabs TTS API via the /api/voice endpoint.
 */
const AUTO_SPEAK_STORAGE_KEY = "auto-speak-enabled";

// Get initial state from localStorage, defaulting to true (ON)
function getInitialAutoSpeakState(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(AUTO_SPEAK_STORAGE_KEY);
  // Default to true if not set
  if (stored === null) return true;
  return stored === "true";
}

export const useAutoSpeak = ({
  messages,
  status,
  botType,
}: {
  messages: ChatMessage[];
  status: "ready" | "submitted" | "streaming" | "error";
  botType: BotType;
}) => {
  const [state, setState] = useState<AutoSpeakState>("idle");
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(() =>
    getInitialAutoSpeakState(),
  );
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const wasStreamingRef = useRef(false);
  const currentPlayIdRef = useRef<string | null>(null);

  // Persist auto-speak setting to localStorage
  useEffect(() => {
    localStorage.setItem(AUTO_SPEAK_STORAGE_KEY, String(isAutoSpeakEnabled));
  }, [isAutoSpeakEnabled]);

  // Subscribe to global audio state changes
  useEffect(() => {
    const unsubscribe = subscribeToAudioChanges((isPlaying, _source) => {
      // If audio stopped and we were playing, reset our state
      if (!isPlaying && currentPlayIdRef.current !== null) {
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
  }, []);

  const pause = useCallback(() => {
    if (state === "playing") {
      pauseAudio();
      setState("paused");
    }
  }, [state]);

  const resume = useCallback(async () => {
    if (state === "paused") {
      await resumeAudio();
      setState("playing");
    }
  }, [state]);

  const togglePause = useCallback(async () => {
    if (state === "playing") {
      pause();
    } else if (state === "paused") {
      await resume();
    }
  }, [state, pause, resume]);

  const speak = useCallback(async (text: string, messageBotType: BotType) => {
    if (!isVoiceServiceAvailable()) {
      return;
    }

    // Stop any currently playing audio globally
    stopAllAudio();

    if (!text.trim()) {
      return;
    }

    const playId = `auto-${Date.now()}`;
    currentPlayIdRef.current = playId;

    setState("loading");

    const abortController = new AbortController();
    setAbortController(abortController);

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, botType: messageBotType }),
        signal: abortController.signal,
      });

      if (currentPlayIdRef.current !== playId) {
        return;
      }

      if (!response.ok) {
        // If voice service returns 503 (not configured), wait before retry
        if (response.status === 503) {
          markVoiceServiceUnavailable();
          setState("idle");
          currentPlayIdRef.current = null;
          return;
        }
        throw new Error("Failed to generate voice");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (currentPlayIdRef.current !== playId) {
        URL.revokeObjectURL(audioUrl);
        return;
      }

      const audio = new Audio(audioUrl);

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
            currentPlayIdRef.current = null;
            markAudioEnded();
          }
          clearAudioUrl(audioUrl);
        },
        { once: true },
      );

      // Register with global audio manager
      setCurrentAudio(audio, audioUrl, "auto-speak");

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
        setState("error");
        currentPlayIdRef.current = null;
      }
    }
  }, []);

  // Track when streaming starts
  useEffect(() => {
    if (status === "streaming") {
      wasStreamingRef.current = true;
    }
  }, [status]);

  // Auto-speak when streaming completes
  useEffect(() => {
    if (!isAutoSpeakEnabled) {
      return;
    }

    // Check if we just finished streaming (was streaming, now ready)
    if (wasStreamingRef.current && status === "ready") {
      wasStreamingRef.current = false;

      // Get the latest assistant message
      const lastMessage = messages.at(-1);
      if (!lastMessage || lastMessage.role !== "assistant") {
        return;
      }

      // Don't speak the same message twice
      if (lastSpokenMessageIdRef.current === lastMessage.id) {
        return;
      }

      // Extract text content from message parts
      let textContent = lastMessage.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n")
        .trim();

      // Clean text for TTS using shared utility
      if (textContent) {
        textContent = stripMarkdownForTTS(textContent);
      }

      if (textContent) {
        lastSpokenMessageIdRef.current = lastMessage.id;
        // Use the botType from message metadata if available, otherwise use the current botType
        const messageBotType =
          (lastMessage.metadata?.botType as BotType) ?? botType;
        speak(textContent, messageBotType);
      }
    }
  }, [messages, status, botType, isAutoSpeakEnabled, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const toggleAutoSpeak = useCallback(() => {
    setIsAutoSpeakEnabled((prev) => !prev);
    if (state === "playing" || state === "loading") {
      stop();
    }
  }, [state, stop]);

  return {
    state,
    isAutoSpeakEnabled,
    toggleAutoSpeak,
    stop,
    pause,
    resume,
    togglePause,
    isLoading: state === "loading",
    isPlaying: state === "playing",
    isPaused: state === "paused",
  };
};
