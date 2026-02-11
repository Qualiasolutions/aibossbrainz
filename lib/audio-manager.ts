/**
 * Global audio manager for voice playback
 * Ensures only one audio plays at a time across the entire application
 */

type AudioSource = "manual" | "auto-speak" | "greeting";

interface AudioState {
  audio: HTMLAudioElement | null;
  abortController: AbortController | null;
  audioUrl: string | null;
  source: AudioSource | null;
  isPaused: boolean;
}

const state: AudioState = {
  audio: null,
  abortController: null,
  audioUrl: null,
  source: null,
  isPaused: false,
};

type StateChangeCallback = (
  isPlaying: boolean,
  source: AudioSource | null,
) => void;
const subscribers = new Set<StateChangeCallback>();

// Safety limit to prevent memory leaks from improper cleanup
const MAX_SUBSCRIBERS = 50;

const notifySubscribers = (isPlaying: boolean) => {
  for (const callback of subscribers) {
    callback(isPlaying, state.source);
  }
};

/**
 * Stop all audio playback globally (resets to beginning)
 */
export const stopAllAudio = () => {
  if (state.audio) {
    state.audio.pause();
    state.audio.currentTime = 0;
    state.audio = null;
  }
  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }
  if (state.audioUrl) {
    URL.revokeObjectURL(state.audioUrl);
    state.audioUrl = null;
  }
  state.source = null;
  state.isPaused = false;
  notifySubscribers(false);
};

/**
 * Pause audio playback (preserves position)
 */
export const pauseAudio = () => {
  if (state.audio && !state.isPaused) {
    state.audio.pause();
    state.isPaused = true;
    notifySubscribers(false);
  }
};

/**
 * Resume audio playback from paused position
 */
export const resumeAudio = async () => {
  if (state.audio && state.isPaused) {
    try {
      await state.audio.play();
      state.isPaused = false;
      notifySubscribers(true);
    } catch {
      // If resume fails, reset state
      state.isPaused = false;
      notifySubscribers(false);
    }
  }
};

/**
 * Toggle between pause and resume
 */
export const togglePauseResume = async () => {
  if (state.isPaused) {
    await resumeAudio();
  } else if (state.audio) {
    pauseAudio();
  }
};

/**
 * Check if audio is paused
 */
export const isAudioPaused = () => state.isPaused;

/**
 * Set the current audio element
 */
export const setCurrentAudio = (
  audio: HTMLAudioElement,
  audioUrl: string,
  source: AudioSource,
) => {
  // Stop any existing audio first
  stopAllAudio();

  state.audio = audio;
  state.audioUrl = audioUrl;
  state.source = source;
  notifySubscribers(true);
};

/**
 * Set the current abort controller for fetch requests
 */
export const setAbortController = (controller: AbortController) => {
  if (state.abortController) {
    state.abortController.abort();
  }
  state.abortController = controller;
};

/**
 * Clear the audio URL reference (for cleanup after audio ends)
 */
export const clearAudioUrl = (url: string) => {
  if (state.audioUrl === url) {
    URL.revokeObjectURL(url);
    state.audioUrl = null;
  }
};

/**
 * Mark audio as finished playing
 */
export const markAudioEnded = () => {
  state.audio = null;
  state.source = null;
  notifySubscribers(false);
};

/**
 * Check if audio is currently playing
 */
export const isAudioPlaying = () => state.audio !== null;

/**
 * Get the current audio source
 */
export const getCurrentSource = () => state.source;

/**
 * Update playback rate of currently playing audio
 */
export const updatePlaybackRate = (rate: number) => {
  if (state.audio) {
    state.audio.playbackRate = Math.max(0.5, Math.min(3, rate));
  }
};

/**
 * Update volume of currently playing audio
 */
export const updateVolume = (volume: number) => {
  if (state.audio) {
    state.audio.volume = Math.max(0, Math.min(1, volume));
  }
};

/**
 * Get current audio element (for reading current playback state)
 */
export const getCurrentAudio = () => state.audio;

/**
 * Subscribe to audio state changes
 * Includes safety limit to prevent memory leaks
 */
export const subscribeToAudioChanges = (callback: StateChangeCallback) => {
  // Safety check: if we've hit max subscribers, clear all and warn
  // This prevents memory leaks from improper cleanup
  if (subscribers.size >= MAX_SUBSCRIBERS) {
    console.warn(
      "[AudioManager] Max subscribers reached, clearing old subscriptions",
    );
    subscribers.clear();
  }
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};
