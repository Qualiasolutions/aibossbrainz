import { z } from "zod";

// Text part - allow longer messages (10K chars)
const textPartSchema = z
	.object({
		type: z.enum(["text"]),
		text: z.string().min(1).max(10000),
	})
	.passthrough();

// File part - accept any image media type
const filePartSchema = z
	.object({
		type: z.enum(["file"]),
		mediaType: z.string(), // Accept any media type
		name: z.string().min(1).max(255),
		url: z.string().url(),
	})
	.passthrough();

const partSchema = z.union([textPartSchema, filePartSchema]);

// Message schema - allow extra fields from AI SDK (metadata, etc.)
const messageSchema = z
	.object({
		id: z.string().uuid(),
		role: z.enum(["user"]),
		parts: z.array(partSchema),
	})
	.passthrough();

export const postRequestBodySchema = z
	.object({
		id: z.string().uuid(),
		message: messageSchema,
		selectedChatModel: z.enum(["chat-model", "chat-model-reasoning"]),
		selectedVisibilityType: z.enum(["public", "private"]),
		selectedBotType: z
			.enum(["alexandria", "kim", "collaborative"])
			.default("alexandria"),
		focusMode: z
			.enum([
				"default",
				"business_analysis",
				"pricing",
				"key_messaging",
				"customer_journey",
				"social_media",
				"launch_strategy",
			])
			.default("default"),
	})
	.passthrough();

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
