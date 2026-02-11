import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "voice-playback-speed";
const DEFAULT_SPEED = 1.0;
const MIN_SPEED = 0.5;
const MAX_SPEED = 3.0;
const SPEED_STEP = 0.25;

export const SPEED_PRESETS = [
  { value: 1.0, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2.0, label: "2x" },
  { value: 2.5, label: "2.5x" },
  { value: 3.0, label: "3x" },
] as const;

export function useVoiceSpeed() {
  const [speed, setSpeedState] = useState<number>(DEFAULT_SPEED);

  // Load saved speed from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number.parseFloat(saved);
      if (!Number.isNaN(parsed) && parsed >= MIN_SPEED && parsed <= MAX_SPEED) {
        setSpeedState(parsed);
      }
    }
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    const clamped = Math.max(MIN_SPEED, Math.min(MAX_SPEED, newSpeed));
    setSpeedState(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  }, []);

  const incrementSpeed = useCallback(() => {
    setSpeed(speed + SPEED_STEP);
  }, [speed, setSpeed]);

  const decrementSpeed = useCallback(() => {
    setSpeed(speed - SPEED_STEP);
  }, [speed, setSpeed]);

  const resetSpeed = useCallback(() => {
    setSpeed(DEFAULT_SPEED);
  }, [setSpeed]);

  return {
    speed,
    setSpeed,
    incrementSpeed,
    decrementSpeed,
    resetSpeed,
    minSpeed: MIN_SPEED,
    maxSpeed: MAX_SPEED,
    speedStep: SPEED_STEP,
  };
}
