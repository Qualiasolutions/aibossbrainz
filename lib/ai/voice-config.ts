import type { BotType } from "@/lib/bot-personalities";
import { env } from "@/lib/env";

export type VoiceConfig = {
	voiceId: string;
	modelId: string;
	settings: {
		stability: number;
		similarityBoost: number;
		style?: number;
		useSpeakerBoost?: boolean;
	};
};

// Voice IDs provided by user:
// Alexandria: kfxR5DufiGBogKn26hyv
// Kim: wMmwtV1VyRNXQx00eD6W
// Using ElevenLabs Turbo v2.5 for cost efficiency (significantly cheaper than v3)
// Turbo models support full 0-1 stability range
export const VOICE_CONFIGS: Record<BotType, VoiceConfig> = {
	alexandria: {
		voiceId:
			env.ELEVENLABS_VOICE_ID_ALEXANDRIA ?? "kfxR5DufiGBogKn26hyv",
		modelId: "eleven_turbo_v2_5",
		settings: {
			stability: 0.5,
			similarityBoost: 0.8,
			style: 0.3,
			useSpeakerBoost: true,
		},
	},
	kim: {
		voiceId: env.ELEVENLABS_VOICE_ID_KIM ?? "wMmwtV1VyRNXQx00eD6W",
		modelId: "eleven_turbo_v2_5",
		settings: {
			stability: 0.7,
			similarityBoost: 0.8,
			style: 0.2,
			useSpeakerBoost: true,
		},
	},
	collaborative: {
		// Use Alexandria's voice for collaborative mode
		voiceId:
			env.ELEVENLABS_VOICE_ID_ALEXANDRIA ?? "kfxR5DufiGBogKn26hyv",
		modelId: "eleven_turbo_v2_5",
		settings: {
			stability: 0.5,
			similarityBoost: 0.8,
			style: 0.25,
			useSpeakerBoost: true,
		},
	},
};

export const getVoiceConfig = (botType: BotType): VoiceConfig => {
	return VOICE_CONFIGS[botType];
};

export const getVoiceForBot = (botType: BotType): string => {
	return VOICE_CONFIGS[botType].voiceId;
};

// Maximum text length for TTS (to control costs)
export const MAX_TTS_TEXT_LENGTH = 5000;
