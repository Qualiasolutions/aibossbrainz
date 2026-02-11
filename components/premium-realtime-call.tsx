"use client";

import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface PremiumRealtimeCallProps {
  botType: BotType;
  onEndCall: (chatId?: string) => void;
}

type CallState =
  | "idle"
  | "requesting-permissions"
  | "connecting"
  | "active"
  | "processing"
  | "speaking"
  | "ended";

export function PremiumRealtimeCall({
  botType,
  onEndCall,
}: PremiumRealtimeCallProps) {
  const { mutate } = useSWRConfig();
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [voiceCallChatId, setVoiceCallChatId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const bot = BOT_PERSONALITIES[botType];

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // Initialize audio analysis
  const initAudioAnalysis = useCallback(
    async (stream: MediaStream) => {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      updateAudioLevel();
    },
    [updateAudioLevel],
  );

  // Send message to AI
  const sendToAI = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      try {
        setCallState("processing");
        setAiResponse("");

        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/realtime/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            botType,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to get AI response");
        }

        const data = await response.json();
        const aiText = data.text;
        const audioUrl = data.audioUrl;
        const chatId = data.chatId;

        if (chatId) {
          setVoiceCallChatId(chatId);
        }

        setAiResponse(aiText);
        setCallState("speaking");
        setIsAiSpeaking(true);

        if (audioUrl) {
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            setIsAiSpeaking(false);
            setCallState("active");
            if (recognitionRef.current && !isMuted) {
              try {
                recognitionRef.current.start();
              } catch {
                // Already started
              }
            }
          };

          audio.onerror = () => {
            setIsAiSpeaking(false);
            setCallState("active");
          };

          await audio.play();
        } else {
          setIsAiSpeaking(false);
          setCallState("active");
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("AI response error:", error);
          toast.error("Failed to get response");
        }
        setCallState("active");
        setIsAiSpeaking(false);
      }
    },
    [botType, isMuted],
  );

  // Initialize speech recognition
  const initSpeechRecognition = useCallback((): SpeechRecognition | null => {
    if (typeof window === "undefined") return null;

    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      toast.error("Speech recognition not supported in this browser");
      return null;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += `${result[0].transcript} `;

          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              const textToSend = finalTranscript.trim();
              finalTranscript = "";
              setTranscript("");

              recognition.stop();
              sendToAI(textToSend);
            }
          }, 1200);
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied");
        setCallState("ended");
      }
    };

    recognition.onend = () => {
      if (callState === "active" && !isMuted && !isAiSpeaking) {
        try {
          recognition.start();
        } catch {
          // Already started
        }
      }
    };

    return recognition;
  }, [callState, isMuted, isAiSpeaking, sendToAI]);

  // Start the call
  const startCall = useCallback(async () => {
    setCallState("requesting-permissions");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      setCallState("connecting");

      await initAudioAnalysis(stream);

      const recognition = initSpeechRecognition();
      if (!recognition) {
        setCallState("idle");
        return;
      }
      recognitionRef.current = recognition;

      recognition.start();
      callStartTimeRef.current = Date.now();
      setCallState("active");

      toast.success(`Connected to ${bot.name}`);
    } catch (error) {
      console.error("Failed to start call:", error);
      toast.error("Failed to access microphone");
      setCallState("idle");
    }
  }, [initAudioAnalysis, initSpeechRecognition, bot.name]);

  // End the call
  const endCall = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setCallState("ended");
    toast.success("Call ended");

    mutate("/api/history");

    setTimeout(() => onEndCall(voiceCallChatId || undefined), 1500);
  }, [onEndCall, voiceCallChatId, mutate]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;

      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getAudioTracks()) {
          track.enabled = !newMuted;
        }
      }

      if (newMuted) {
        recognitionRef.current?.stop();
      } else if (callState === "active" && !isAiSpeaking) {
        try {
          recognitionRef.current?.start();
        } catch {
          // Already started
        }
      }

      return newMuted;
    });
  }, [callState, isAiSpeaking]);

  // Update call duration
  useEffect(() => {
    if (
      callState !== "active" &&
      callState !== "processing" &&
      callState !== "speaking"
    )
      return;

    const interval = setInterval(() => {
      setCallDuration(
        Math.floor((Date.now() - callStartTimeRef.current) / 1000),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (currentAudioRef.current) currentAudioRef.current.pause();
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Auto-start call
  useEffect(() => {
    if (callState === "idle") {
      startCall();
    }
  }, [callState, startCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case "requesting-permissions":
        return "Requesting microphone access";
      case "connecting":
        return "Connecting";
      case "active":
        return isMuted ? "Muted" : "Listening";
      case "processing":
        return "Thinking";
      case "speaking":
        return `${bot.name.split(" ")[0]} is speaking`;
      case "ended":
        return "Call ended";
      default:
        return "Ready";
    }
  };

  const isCallActive =
    callState === "active" ||
    callState === "processing" ||
    callState === "speaking";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-8 py-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-2 rounded-full transition-colors",
              isCallActive
                ? "animate-pulse bg-emerald-500"
                : callState === "connecting" ||
                    callState === "requesting-permissions"
                  ? "animate-pulse bg-amber-500"
                  : "bg-neutral-300",
            )}
          />
          <span className="text-sm font-medium text-neutral-500">
            {isCallActive ? formatDuration(callDuration) : getStatusText()}
          </span>
        </div>
        <p className="text-xs font-medium tracking-wide uppercase text-neutral-400">
          Voice Call
        </p>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Avatar with visualization */}
        <div className="relative mb-10">
          {/* Outer ring - audio visualization */}
          <div
            className={cn(
              "absolute -inset-4 rounded-full border-2 transition-all duration-200",
              isAiSpeaking
                ? "border-red-200"
                : audioLevel > 0.05
                  ? "border-neutral-200"
                  : "border-transparent",
            )}
            style={{
              transform: `scale(${1 + (isAiSpeaking ? 0.08 : audioLevel * 0.15)})`,
              opacity: isCallActive ? 1 : 0.3,
            }}
          />

          {/* Second ring */}
          <div
            className={cn(
              "absolute -inset-8 rounded-full border transition-all duration-300",
              isAiSpeaking
                ? "border-red-100"
                : audioLevel > 0.1
                  ? "border-neutral-100"
                  : "border-transparent",
            )}
            style={{
              transform: `scale(${1 + (isAiSpeaking ? 0.04 : audioLevel * 0.08)})`,
              opacity: isCallActive ? 0.6 : 0,
            }}
          />

          {/* Avatar */}
          <div className="relative size-36 overflow-hidden rounded-full bg-neutral-100 shadow-lg shadow-neutral-200/80 md:size-44">
            {bot.avatar ? (
              <Image
                alt={bot.name}
                className="size-full object-cover"
                height={176}
                src={bot.avatar}
                width={176}
              />
            ) : (
              <div
                className={cn(
                  "flex size-full items-center justify-center bg-gradient-to-br",
                  bot.color,
                )}
              >
                <span className="font-semibold text-4xl text-white">
                  {botType === "collaborative" ? "A&K" : bot.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Speaking indicator */}
          {isAiSpeaking && (
            <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5">
              <span className="h-2.5 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite] rounded-full bg-red-500" />
              <span className="h-4 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite_0.1s] rounded-full bg-red-500" />
              <span className="h-5 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite_0.2s] rounded-full bg-red-500" />
              <span className="h-4 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite_0.3s] rounded-full bg-red-500" />
              <span className="h-2.5 w-0.5 animate-[bounce_0.6s_ease-in-out_infinite_0.4s] rounded-full bg-red-500" />
            </div>
          )}
        </div>

        {/* Name and status */}
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900 md:text-3xl">
          {bot.name}
        </h1>
        <p className="mb-10 text-xs font-medium tracking-wide uppercase text-red-700">
          {bot.role}
        </p>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {/* Mute button */}
          <Button
            className={cn(
              "size-14 rounded-full transition-all",
              isMuted
                ? "border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                : "border-2 border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50",
            )}
            disabled={
              callState === "connecting" ||
              callState === "requesting-permissions"
            }
            onClick={toggleMute}
            size="icon"
          >
            {isMuted ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </Button>

          {/* End call button */}
          <Button
            className="size-16 rounded-full bg-red-600 text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 hover:shadow-red-300 hover:scale-105"
            onClick={endCall}
            size="icon"
          >
            <PhoneOff className="size-6" />
          </Button>

          {/* Volume button */}
          <Button
            className="size-14 rounded-full border-2 border-neutral-200 bg-white text-neutral-700 transition-all hover:bg-neutral-50"
            disabled
            size="icon"
          >
            <Volume2 className="size-5" />
          </Button>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="py-6" />
    </div>
  );
}
