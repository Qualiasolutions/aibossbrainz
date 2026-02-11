"use client";

import { Mic, MicOff, PhoneOff, Settings, Volume2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

    // Calculate average level
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

        // Store the chatId for redirect when call ends
        if (chatId && !voiceCallChatId) {
          setVoiceCallChatId(chatId);
        }

        setAiResponse(aiText);
        setCallState("speaking");
        setIsAiSpeaking(true);

        // Play audio response
        if (audioUrl) {
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            setIsAiSpeaking(false);
            setCallState("active");
            // Resume listening
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

          // Clear silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // Set timeout to send after brief silence
          silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              const textToSend = finalTranscript.trim();
              finalTranscript = "";
              setTranscript("");

              // Stop listening while processing
              recognition.stop();
              sendToAI(textToSend);
            }
          }, 1200); // 1.2 second silence threshold
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
      // Restart if still in active state and not muted
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
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      setCallState("connecting");

      // Initialize audio analysis
      await initAudioAnalysis(stream);

      // Initialize speech recognition
      const recognition = initSpeechRecognition();
      if (!recognition) {
        setCallState("idle");
        return;
      }
      recognitionRef.current = recognition;

      // Start recognition
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
    // Stop recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    // Abort requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear timeouts
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    // Stop animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setCallState("ended");
    toast.success("Call ended");

    // Pass chatId to parent for redirect
    setTimeout(() => onEndCall(voiceCallChatId || undefined), 1500);
  }, [onEndCall, voiceCallChatId]);

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
        return "Requesting microphone access...";
      case "connecting":
        return "Connecting...";
      case "active":
        return isMuted ? "Muted" : "Listening...";
      case "processing":
        return "Thinking...";
      case "speaking":
        return `${bot.name.split(" ")[0]} is speaking...`;
      case "ended":
        return "Call ended";
      default:
        return "Ready";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-stone-900 via-stone-950 to-black">
      {/* Top bar */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-3 rounded-full",
              callState === "active" ||
                callState === "processing" ||
                callState === "speaking"
                ? "animate-pulse bg-emerald-500"
                : callState === "connecting" ||
                    callState === "requesting-permissions"
                  ? "animate-pulse bg-yellow-500"
                  : "bg-stone-600",
            )}
          />
          <span className="text-sm text-stone-400">
            {callState === "active" ||
            callState === "processing" ||
            callState === "speaking"
              ? formatDuration(callDuration)
              : getStatusText()}
          </span>
        </div>
        <Button
          className="text-stone-400 hover:text-white"
          size="icon"
          variant="ghost"
        >
          <Settings className="size-5" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Avatar with waveform */}
        <div className="relative mb-8">
          {/* Outer ring - audio visualization */}
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-150",
              isAiSpeaking
                ? "bg-gradient-to-br from-rose-500/30 to-pink-500/30"
                : "bg-white/5",
            )}
            style={{
              transform: `scale(${1 + (isAiSpeaking ? 0.15 : audioLevel * 0.3)})`,
              opacity:
                callState === "active" || callState === "speaking" ? 1 : 0.5,
            }}
          />

          {/* Inner ring */}
          <div
            className={cn(
              "absolute inset-2 rounded-full bg-gradient-to-br transition-opacity duration-300",
              bot.color,
              isAiSpeaking ? "opacity-40" : "opacity-20",
            )}
          />

          {/* Avatar */}
          <div
            className={cn(
              "relative flex size-40 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br shadow-2xl md:size-48",
              bot.color,
            )}
          >
            {bot.avatar ? (
              <Image
                alt={bot.name}
                className="size-full object-cover"
                height={192}
                src={bot.avatar}
                width={192}
              />
            ) : (
              <span className="font-bold text-5xl text-white">
                {botType === "collaborative" ? "A&K" : bot.name.charAt(0)}
              </span>
            )}
          </div>

          {/* Speaking indicator */}
          {isAiSpeaking && (
            <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
              <span className="h-2 w-1 animate-[bounce_0.5s_ease-in-out_infinite] rounded-full bg-rose-500" />
              <span className="h-3 w-1 animate-[bounce_0.5s_ease-in-out_infinite_0.1s] rounded-full bg-rose-500" />
              <span className="h-4 w-1 animate-[bounce_0.5s_ease-in-out_infinite_0.2s] rounded-full bg-rose-500" />
              <span className="h-3 w-1 animate-[bounce_0.5s_ease-in-out_infinite_0.3s] rounded-full bg-rose-500" />
              <span className="h-2 w-1 animate-[bounce_0.5s_ease-in-out_infinite_0.4s] rounded-full bg-rose-500" />
            </div>
          )}
        </div>

        {/* Name and status */}
        <h1 className="mb-2 font-semibold text-2xl text-white md:text-3xl">
          {bot.name}
        </h1>
        <p className="mb-8 text-stone-400">{getStatusText()}</p>

        {/* Transcript display */}
        {(transcript || aiResponse) && (
          <div className="mb-8 w-full max-w-lg space-y-4 rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
            {transcript && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl bg-blue-500/20 px-4 py-3 text-blue-100">
                  <p className="mb-1 font-medium text-blue-300 text-xs">You</p>
                  <p className="text-sm">{transcript}</p>
                </div>
              </div>
            )}
            {aiResponse && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-rose-500/20 px-4 py-3 text-rose-100">
                  <p className="mb-1 font-medium text-rose-300 text-xs">
                    {bot.name.split(" ")[0]}
                  </p>
                  <p className="text-sm">
                    {aiResponse.length > 200
                      ? `${aiResponse.slice(0, 200)}...`
                      : aiResponse}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-6">
          {/* Mute button */}
          <Button
            className={cn(
              "size-16 rounded-full transition-all",
              isMuted
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                : "bg-white/10 text-white hover:bg-white/20",
            )}
            disabled={
              callState === "connecting" ||
              callState === "requesting-permissions"
            }
            onClick={toggleMute}
            size="icon"
          >
            {isMuted ? (
              <MicOff className="size-6" />
            ) : (
              <Mic className="size-6" />
            )}
          </Button>

          {/* End call button */}
          <Button
            className="size-20 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all hover:bg-red-600 hover:scale-105"
            onClick={endCall}
            size="icon"
          >
            <PhoneOff className="size-8" />
          </Button>

          {/* Volume button (placeholder) */}
          <Button
            className="size-16 rounded-full bg-white/10 text-white transition-all hover:bg-white/20"
            disabled
            size="icon"
          >
            <Volume2 className="size-6" />
          </Button>
        </div>
      </div>

      {/* Bottom tips */}
      <div className="p-6 text-center">
        <p className="text-sm text-stone-500">
          {callState === "active" && !isMuted && (
            <>Speak naturally. I'll respond when you pause.</>
          )}
          {callState === "active" && isMuted && (
            <>Unmute to continue talking.</>
          )}
          {callState === "processing" && <>Processing your message...</>}
          {callState === "speaking" && <>Listening to response...</>}
        </p>
      </div>
    </div>
  );
}
