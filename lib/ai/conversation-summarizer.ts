import { generateText } from "ai";
import { myProvider } from "./providers";

interface ConversationSummary {
	text: string;
	topics: string[];
	importance: number;
}

interface MessagePart {
	type: string;
	text?: string;
}

interface Message {
	role: string;
	parts: unknown[];
}

/**
 * Generates a summary of a conversation for cross-chat memory.
 * Returns null if the conversation is too short to summarize.
 */
export async function generateConversationSummary(
	messages: Message[],
): Promise<ConversationSummary | null> {
	// Only summarize conversations with substantive content
	const userMessages = messages.filter((m) => m.role === "user");
	if (userMessages.length < 2) return null;

	// Extract text content from messages
	const conversationText = messages
		.slice(-20) // Only use last 20 messages to avoid token limits
		.map((m) => {
			const textParts = (m.parts as MessagePart[])
				.filter((p) => p.type === "text" && p.text)
				.map((p) => p.text)
				.join(" ");
			return `${m.role}: ${textParts}`;
		})
		.filter((line) => line.length > 10) // Filter out empty messages
		.join("\n");

	if (conversationText.length < 100) return null;

	try {
		const result = await generateText({
			model: myProvider.languageModel("chat-model"),
			maxOutputTokens: 300,
			temperature: 0.3,
			prompt: `Summarize this conversation in 2-3 sentences focusing on key business insights, decisions, or action items. Also extract 3-5 topic tags relevant to business/marketing/sales.

Conversation:
${conversationText.slice(0, 4000)}

Respond ONLY in this exact JSON format (no other text):
{
  "summary": "2-3 sentence summary here",
  "topics": ["tag1", "tag2", "tag3"],
  "importance": 5
}

The importance field should be 1-10 (10 = critical business decision, 1 = casual chat).`,
		});

		// Parse JSON response
		const jsonMatch = result.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn("[Summarizer] Could not extract JSON from response");
			return null;
		}

		const parsed = JSON.parse(jsonMatch[0]);
		return {
			text: parsed.summary || "",
			topics: Array.isArray(parsed.topics) ? parsed.topics : [],
			importance: typeof parsed.importance === "number" ? parsed.importance : 5,
		};
	} catch (error) {
		console.warn("[Summarizer] Failed to generate summary:", error);
		return null;
	}
}
