"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  onTranscript?: (transcript: string) => void;
  isListening?: boolean;
  className?: string;
}

export function VoiceControls({
  onTranscript,
  isListening = false,
  className,
}: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [_isPlaying, _setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingTime(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const _audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });

        // Simulate transcription process
        setTimeout(() => {
          const mockTranscript =
            "This is a simulated voice transcript. In a real implementation, this would be sent to a speech-to-text service.";
          setTranscript(mockTranscript);
          onTranscript?.(mockTranscript);
          setIsProcessing(false);
        }, 1500);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            className={cn(
              "relative overflow-hidden transition-all duration-300",
              isRecording && "animate-pulse bg-red-500 hover:bg-red-600",
              isProcessing && "cursor-not-allowed opacity-50",
            )}
            disabled={isProcessing}
            onClick={isRecording ? stopRecording : startRecording}
            size="lg"
          >
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                  exit={{ scale: 0 }}
                  initial={{ scale: 0 }}
                  key="recording"
                >
                  <Square className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {formatTime(recordingTime)}
                  </span>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  initial={{ scale: 0 }}
                  key="processing"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2"
                  exit={{ scale: 0 }}
                  initial={{ scale: 0 }}
                  key="idle"
                >
                  <Mic className="h-4 w-4" />
                  <span className="font-medium text-sm">Start Recording</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>

        <Button
          className="transition-all duration-200"
          onClick={() => setAudioEnabled(!audioEnabled)}
          size="icon"
          variant="outline"
        >
          {audioEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {transcript && (
          <Badge className="bg-green-50 text-green-700" variant="secondary">
            Voice Ready
          </Badge>
        )}
      </div>

      {audioEnabled && (
        <div className="flex items-center gap-3">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <Progress
            className="h-2 flex-1"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const newVolume = Math.max(0, Math.min(1, x / rect.width));
              setVolume(newVolume);
            }}
            value={volume * 100}
          />
          <span className="w-10 text-muted-foreground text-xs">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}

      {transcript && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-muted p-3"
          initial={{ opacity: 0, y: 10 }}
        >
          <p className="mb-1 text-muted-foreground text-sm">Transcript:</p>
          <p className="text-sm">{transcript}</p>
        </motion.div>
      )}

      {isRecording && (
        <motion.div
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-red-600 text-sm"
          initial={{ opacity: 0 }}
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Recording in progress...
        </motion.div>
      )}
    </div>
  );
}
