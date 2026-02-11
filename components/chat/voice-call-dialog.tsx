"use client";

import { Loader2, Mic, Phone, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VoiceCallStatus } from "@/hooks/use-voice-call";
import type { BotPersonality } from "@/lib/bot-personalities";

const STATUS_CONFIG: Record<
  VoiceCallStatus,
  { bg: string; icon: React.ReactNode; label: string }
> = {
  idle: {
    bg: "bg-stone-100",
    icon: <Phone className="size-12 text-stone-400" />,
    label: "Ready to call",
  },
  connecting: {
    bg: "animate-pulse bg-red-100",
    icon: <Loader2 className="size-12 animate-spin text-red-500" />,
    label: "Connecting...",
  },
  listening: {
    bg: "bg-emerald-100",
    icon: <Mic className="size-12 text-emerald-500" />,
    label: "Listening...",
  },
  processing: {
    bg: "animate-pulse bg-blue-100",
    icon: <Loader2 className="size-12 animate-spin text-blue-500" />,
    label: "Thinking...",
  },
  speaking: {
    bg: "bg-purple-100",
    icon: <Volume2 className="size-12 text-purple-500" />,
    label: "Speaking...",
  },
  error: {
    bg: "bg-red-100",
    icon: <PhoneOff className="size-12 text-red-500" />,
    label: "Error",
  },
};

interface VoiceCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personality: BotPersonality;
  status: VoiceCallStatus;
  transcript: string | null;
  error: string | null;
  duration: number;
  onStartCall: () => void;
  onEndCall: () => void;
  formatDuration: (seconds: number) => string;
}

export function VoiceCallDialog({
  open,
  onOpenChange,
  personality,
  status,
  transcript,
  error,
  duration,
  onStartCall,
  onEndCall,
  formatDuration,
}: VoiceCallDialogProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className={`size-8 rounded-full bg-gradient-to-br ${personality.color}`}
            />
            <span>Voice Call with {personality.name}</span>
          </DialogTitle>
          <DialogDescription>{personality.role}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Status indicator */}
          <div className="relative">
            <div
              className={`flex size-32 items-center justify-center rounded-full transition-all ${config.bg}`}
            >
              {config.icon}
            </div>

            {status === "listening" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="size-32 animate-ping rounded-full border-2 border-emerald-400 opacity-30" />
              </div>
            )}
          </div>

          {/* Status text */}
          <div className="text-center">
            <p className="font-medium text-lg text-stone-700">{config.label}</p>
            {status !== "idle" && status !== "error" && (
              <p className="mt-1 text-sm text-stone-500">
                {formatDuration(duration)}
              </p>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="w-full rounded-lg bg-stone-50 p-3">
              <p className="text-center text-sm text-stone-600">{transcript}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="w-full rounded-lg bg-red-50 p-3">
              <p className="text-center text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Call controls */}
          <div className="flex gap-4">
            {status === "idle" || status === "error" ? (
              <Button
                className="gap-2 bg-emerald-500 hover:bg-emerald-600"
                onClick={onStartCall}
                size="lg"
                type="button"
              >
                <Phone className="size-5" />
                Start Call
              </Button>
            ) : (
              <Button
                className="gap-2 bg-red-500 hover:bg-red-600"
                onClick={onEndCall}
                size="lg"
                type="button"
              >
                <PhoneOff className="size-5" />
                End Call
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-stone-400">
            Speak naturally. {personality.name} will respond with their voice.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
