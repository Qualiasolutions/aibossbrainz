import { createHash } from "node:crypto";
import { list, put } from "@vercel/blob";
import type { VoiceConfig } from "@/lib/ai/voice-config";
import { logger } from "@/lib/logger";

/**
 * Content-addressable TTS cache backed by Vercel Blob.
 *
 * Caches ElevenLabs audio by hashing all voice parameters + text into a
 * deterministic pathname. Repeated requests for identical text+voice
 * return the cached Blob CDN URL instead of calling ElevenLabs again.
 */

interface TTSCacheParams {
	text: string;
	voiceId: string;
	modelId: string;
	stability: number;
	similarityBoost: number;
	style: number;
	useSpeakerBoost: boolean;
}

/**
 * Build a flat cache params object from text and a VoiceConfig.
 */
export function buildCacheParams(
	text: string,
	voiceConfig: VoiceConfig,
): TTSCacheParams {
	return {
		text,
		voiceId: voiceConfig.voiceId,
		modelId: voiceConfig.modelId,
		stability: voiceConfig.settings.stability,
		similarityBoost: voiceConfig.settings.similarityBoost,
		style: voiceConfig.settings.style ?? 0,
		useSpeakerBoost: voiceConfig.settings.useSpeakerBoost ?? true,
	};
}

/**
 * Generate a deterministic cache key (Blob pathname) from TTS parameters.
 * Uses SHA-256 of a canonical JSON serialization.
 */
export function generateTTSCacheKey(params: TTSCacheParams): string {
	// Sort keys for deterministic serialization
	const canonical = JSON.stringify(params, Object.keys(params).sort());
	const hash = createHash("sha256").update(canonical).digest("hex");
	return `tts-cache/${hash}.mp3`;
}

/**
 * Check if cached audio exists for the given TTS parameters.
 * Returns the Blob CDN URL on hit, null on miss.
 */
export async function getCachedAudio(
	params: TTSCacheParams,
): Promise<string | null> {
	try {
		const key = generateTTSCacheKey(params);
		const result = await list({ prefix: key, limit: 1 });

		if (result.blobs.length > 0 && result.blobs[0].pathname === key) {
			logger.debug({ key }, "TTS cache hit");
			return result.blobs[0].url;
		}

		logger.debug({ key }, "TTS cache miss");
		return null;
	} catch (err) {
		// Treat any error as a cache miss -- don't break TTS
		logger.debug({ err }, "TTS cache lookup failed, treating as miss");
		return null;
	}
}

/**
 * Store generated audio in the cache. Returns the Blob CDN URL.
 * On failure, logs a warning and returns empty string (cache write
 * failure must never break TTS generation).
 */
export async function cacheAudio(
	params: TTSCacheParams,
	audioBuffer: ArrayBuffer,
): Promise<string> {
	try {
		const key = generateTTSCacheKey(params);
		const blob = await put(key, Buffer.from(audioBuffer), {
			access: "public",
			contentType: "audio/mpeg",
			addRandomSuffix: false,
		});
		logger.debug({ key, url: blob.url }, "TTS audio cached");
		return blob.url;
	} catch (err) {
		logger.warn({ err }, "TTS cache write failed");
		return "";
	}
}
