"use client";

import { Mic, MicOff, Phone, PhoneOff, Volume2, Waves } from "lucide-react";
import { useRealtimeCall } from "@/hooks/use-realtime-call";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface RealtimeCallProps {
  chatId: string;
  botType: "alexandria" | "kim" | "collaborative";
  onClose?: () => void;
}

export function RealtimeCall({ chatId, botType, onClose }: RealtimeCallProps) {
  const {
    status,
    isListening,
    isSpeaking,
    startCall,
    endCall,
    toggleMute,
    isMuted,
    transcript,
    aiResponse,
  } = useRealtimeCall({
    chatId,
    botType,
  });

  const getBotName = () => {
    switch (botType) {
      case "alexandria":
        return "Alexandria Alecci";
      case "kim":
        return "Kim Mylls";
      case "collaborative":
        return "Alexandria & Kim";
      default:
        return "AI Executive";
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl bg-gradient-to-b from-stone-50 to-stone-100 p-8 shadow-2xl border border-red-200/20">
        {/* Close button */}
        {status === "idle" && (
          <button
            className="absolute top-4 right-4 rounded-full p-2 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
            onClick={onClose}
            type="button"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M6 18L18 6M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
          </button>
        )}

        {/* Avatar/Status */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className={cn(
              "mb-4 flex size-24 items-center justify-center rounded-full bg-gradient-to-br",
              botType === "alexandria"
                ? "from-rose-500 to-pink-600"
                : botType === "kim"
                  ? "from-blue-500 to-indigo-600"
                  : "from-purple-500 to-violet-600",
              (isListening || isSpeaking) && "animate-pulse",
            )}
          >
            {isSpeaking ? (
              <Volume2 className="size-10 text-white" />
            ) : isListening ? (
              <Waves className="size-10 text-white" />
            ) : (
              <span className="font-bold text-3xl text-white">
                {botType === "alexandria"
                  ? "A"
                  : botType === "kim"
                    ? "K"
                    : "A&K"}
              </span>
            )}
          </div>

          <h2 className="font-semibold text-lg text-stone-800">
            {getBotName()}
          </h2>

          <p
            className={cn(
              "mt-1 text-sm",
              status === "active"
                ? isSpeaking
                  ? "text-emerald-600"
                  : isListening
                    ? "text-blue-600"
                    : "text-stone-500"
                : status === "connecting"
                  ? "text-yellow-600"
                  : "text-stone-500",
            )}
          >
            {status === "idle" && "Ready to start call"}
            {status === "connecting" && "Connecting..."}
            {status === "active" && isSpeaking && "Speaking..."}
            {status === "active" &&
              isListening &&
              !isSpeaking &&
              "Listening..."}
            {status === "active" && isMuted && "Muted"}
            {status === "ended" && "Call ended"}
          </p>
        </div>

        {/* Transcript display */}
        {status === "active" && (transcript || aiResponse) && (
          <div className="mb-6 max-h-40 space-y-3 overflow-y-auto rounded-xl bg-stone-200/50 p-4">
            {transcript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white">
                  {transcript}
                </div>
              </div>
            )}
            {aiResponse && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-stone-300 px-4 py-2 text-sm text-stone-800">
                  {aiResponse.length > 150
                    ? `${aiResponse.slice(0, 150)}...`
                    : aiResponse}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {status === "idle" && (
            <Button
              className="h-16 w-16 rounded-full bg-emerald-500 hover:bg-emerald-600"
              onClick={startCall}
              size="icon"
            >
              <Phone className="size-6" />
            </Button>
          )}

          {status === "connecting" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500">
              <div className="size-6 animate-spin rounded-full border-4 border-white border-t-transparent" />
            </div>
          )}

          {status === "active" && (
            <>
              <Button
                className={cn(
                  "h-14 w-14 rounded-full",
                  isMuted
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-stone-300 hover:bg-stone-400 text-stone-700",
                )}
                onClick={toggleMute}
                size="icon"
              >
                {isMuted ? (
                  <MicOff className="size-5" />
                ) : (
                  <Mic className="size-5" />
                )}
              </Button>

              <Button
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                onClick={handleEndCall}
                size="icon"
              >
                <PhoneOff className="size-6" />
              </Button>
            </>
          )}

          {status === "ended" && (
            <div className="text-center text-stone-500">
              <p>Call ended</p>
            </div>
          )}
        </div>

        {/* Tips */}
        {status === "idle" && (
          <p className="mt-6 text-center text-stone-500 text-xs">
            Click the call button to start a voice conversation.
            <br />
            Make sure your microphone is enabled.
          </p>
        )}

        {status === "active" && (
          <p className="mt-6 text-center text-stone-500 text-xs">
            Speak naturally. The AI will respond when you pause.
            <br />
            {isMuted ? "Unmute to continue talking." : "Tap the mic to mute."}
          </p>
        )}
      </div>
    </div>
  );
}
