"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BotType } from "@/lib/bot-personalities";
import type { ChatMessage } from "@/lib/types";

export type VoiceCallStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface UseVoiceCallProps {
  selectedBot: BotType;
  messages: ChatMessage[];
  status: string;
  sendMessage: (message: {
    role: "user";
    parts: { type: "text"; text: string }[];
  }) => void;
}

interface UseVoiceCallReturn {
  // State
  voiceCallOpen: boolean;
  voiceCallStatus: VoiceCallStatus;
  voiceTranscript: string;
  voiceCallError: string | null;
  voiceCallDuration: number;
  isVoiceCallSupported: boolean;

  // Actions
  setVoiceCallOpen: (open: boolean) => void;
  startVoiceCall: () => void;
  endVoiceCall: () => void;

  // Utilities
  formatDuration: (seconds: number) => string;
}

/**
 * Custom hook for managing voice call functionality
 * Extracts voice call logic from chat.tsx for better separation of concerns
 */
export function useVoiceCall({
  selectedBot,
  messages,
  status,
  sendMessage,
}: UseVoiceCallProps): UseVoiceCallReturn {
  // State
  const [voiceCallOpen, setVoiceCallOpen] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] =
    useState<VoiceCallStatus>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceCallError, setVoiceCallError] = useState<string | null>(null);
  const [voiceCallDuration, setVoiceCallDuration] = useState(0);
  const [isVoiceCallSupported, setIsVoiceCallSupported] = useState(false);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceCallStartRef = useRef<number>(0);
  const voiceDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceCallActiveRef = useRef(false);
  const lastMessageCountRef = useRef(messages.length);
  const waitingForResponseRef = useRef(false);
  const voiceCallStatusRef = useRef<VoiceCallStatus>("idle");
  const messagesRef = useRef(messages);

  // Keep messages ref in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Check for Web Speech API support
  const getSpeechRecognition = useCallback(():
    | typeof SpeechRecognition
    | null => {
    if (typeof window === "undefined") return null;
    return (
      window.SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition: typeof SpeechRecognition;
        }
      ).webkitSpeechRecognition ||
      null
    );
  }, []);

  // Check support on mount
  useEffect(() => {
    setIsVoiceCallSupported(getSpeechRecognition() !== null);
  }, [getSpeechRecognition]);

  // Format duration as mm:ss
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Cleanup voice call
  const cleanupVoiceCall = useCallback(() => {
    voiceCallActiveRef.current = false;
    waitingForResponseRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.src = "";
      voiceAudioRef.current = null;
    }

    if (voiceDurationIntervalRef.current) {
      clearInterval(voiceDurationIntervalRef.current);
      voiceDurationIntervalRef.current = null;
    }

    voiceCallStatusRef.current = "idle";
    setVoiceCallStatus("idle");
    setVoiceTranscript("");
    setVoiceCallDuration(0);
  }, []);

  // Speak response using ElevenLabs TTS
  const speakVoiceResponse = useCallback(
    async (text: string): Promise<void> => {
      if (!text.trim() || !voiceCallActiveRef.current) return;

      voiceCallStatusRef.current = "speaking";
      setVoiceCallStatus("speaking");

      try {
        const response = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, botType: selectedBot }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate speech");
        }

        const blob = await response.blob();
        const audioUrl = URL.createObjectURL(blob);

        return new Promise((resolve) => {
          const audio = new Audio(audioUrl);
          voiceAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            voiceAudioRef.current = null;
            resolve();
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            voiceAudioRef.current = null;
            resolve();
          };

          audio.play().catch(() => resolve());
        });
      } catch (err) {
        console.error("TTS error:", err);
      }
    },
    [selectedBot],
  );

  // Start voice listening - defined with useCallback to avoid circular deps
  const startVoiceListening = useCallback(() => {
    if (!voiceCallActiveRef.current) return;

    const SpeechRecognitionClass = getSpeechRecognition();

    if (!SpeechRecognitionClass) {
      setVoiceCallError(
        "Speech recognition not supported. Please use Chrome, Edge, or Safari.",
      );
      voiceCallStatusRef.current = "error";
      setVoiceCallStatus("error");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      if (voiceCallActiveRef.current) {
        voiceCallStatusRef.current = "listening";
        setVoiceCallStatus("listening");
        setVoiceTranscript("");
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!voiceCallActiveRef.current) return;

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setVoiceTranscript(finalTranscript || interimTranscript);

      // If we have a final result, send it as a chat message
      if (finalTranscript.trim() && voiceCallActiveRef.current) {
        try {
          recognition.stop();
        } catch {
          // Ignore
        }

        voiceCallStatusRef.current = "processing";
        setVoiceCallStatus("processing");
        setVoiceTranscript(finalTranscript.trim());
        lastMessageCountRef.current = messagesRef.current.length;
        waitingForResponseRef.current = true;

        // Send the message
        sendMessage({
          role: "user" as const,
          parts: [{ type: "text", text: finalTranscript.trim() }],
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!voiceCallActiveRef.current) return;

      if (event.error === "not-allowed") {
        setVoiceCallError("Microphone access denied.");
        voiceCallStatusRef.current = "error";
        setVoiceCallStatus("error");
        cleanupVoiceCall();
        return;
      }

      if (event.error === "no-speech" || event.error === "aborted") {
        if (voiceCallActiveRef.current && !waitingForResponseRef.current) {
          setTimeout(() => {
            if (voiceCallActiveRef.current && !waitingForResponseRef.current) {
              startVoiceListening();
            }
          }, 100);
        }
        return;
      }

      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      if (
        voiceCallActiveRef.current &&
        voiceCallStatusRef.current === "listening" &&
        !waitingForResponseRef.current
      ) {
        setTimeout(() => {
          if (voiceCallActiveRef.current && !waitingForResponseRef.current) {
            startVoiceListening();
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      if (voiceCallActiveRef.current) {
        setTimeout(() => {
          if (voiceCallActiveRef.current) {
            startVoiceListening();
          }
        }, 500);
      }
    }
  }, [getSpeechRecognition, sendMessage, cleanupVoiceCall]);

  // Start voice call
  const startVoiceCall = useCallback(() => {
    setVoiceCallError(null);
    voiceCallActiveRef.current = true;
    voiceCallStatusRef.current = "connecting";
    setVoiceCallStatus("connecting");
    voiceCallStartRef.current = Date.now();

    voiceDurationIntervalRef.current = setInterval(() => {
      setVoiceCallDuration(
        Math.floor((Date.now() - voiceCallStartRef.current) / 1000),
      );
    }, 1000);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        if (voiceCallActiveRef.current) {
          startVoiceListening();
        }
      })
      .catch((err) => {
        console.error("Microphone permission error:", err);
        setVoiceCallError("Microphone access denied.");
        voiceCallStatusRef.current = "error";
        setVoiceCallStatus("error");
        cleanupVoiceCall();
      });
  }, [startVoiceListening, cleanupVoiceCall]);

  // End voice call
  const endVoiceCall = useCallback(() => {
    cleanupVoiceCall();
    setVoiceCallOpen(false);
  }, [cleanupVoiceCall]);

  // Watch for AI response during voice call
  useEffect(() => {
    if (
      voiceCallActiveRef.current &&
      waitingForResponseRef.current &&
      status === "ready" &&
      messages.length > lastMessageCountRef.current
    ) {
      // Find the latest assistant message
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "assistant") {
        waitingForResponseRef.current = false;

        // Extract text from the message parts
        const textPart = lastMessage.parts?.find((p) => p.type === "text");
        const responseText =
          textPart && "text" in textPart ? textPart.text : "";

        if (responseText && voiceCallActiveRef.current) {
          // Speak the response, then resume listening
          speakVoiceResponse(responseText).then(() => {
            if (voiceCallActiveRef.current) {
              startVoiceListening();
            }
          });
        } else if (voiceCallActiveRef.current) {
          startVoiceListening();
        }
      }
    }
  }, [messages, status, speakVoiceResponse, startVoiceListening]);

  // Cleanup voice call on dialog close
  useEffect(() => {
    if (!voiceCallOpen) {
      cleanupVoiceCall();
    }
    return cleanupVoiceCall;
  }, [voiceCallOpen, cleanupVoiceCall]);

  return {
    // State
    voiceCallOpen,
    voiceCallStatus,
    voiceTranscript,
    voiceCallError,
    voiceCallDuration,
    isVoiceCallSupported,

    // Actions
    setVoiceCallOpen,
    startVoiceCall,
    endVoiceCall,

    // Utilities
    formatDuration,
  };
}
