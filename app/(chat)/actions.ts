"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import type { VisibilityType } from "@/components/visibility-selector";
import { myProvider } from "@/lib/ai/providers";
import {
	deleteMessagesByChatIdAfterTimestamp,
	getChatById,
	getMessageById,
	updateChatVisiblityById,
} from "@/lib/db/queries";
import { withAIGatewayResilience } from "@/lib/resilience";
import { createClient } from "@/lib/supabase/server";

export async function saveChatModelAsCookie(model: string) {
	const cookieStore = await cookies();
	cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
	message,
}: {
	message: UIMessage;
}) {
	try {
		return await withAIGatewayResilience(async () => {
			const { text: title } = await generateText({
				model: myProvider.languageModel("title-model"),
				system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
				prompt: JSON.stringify(message),
				abortSignal: AbortSignal.timeout(10_000),
			});
			return title;
		});
	} catch (error) {
		console.warn("Title generation failed, using fallback:", error);
		return "New conversation";
	}
}

export async function deleteTrailingMessages({ id }: { id: string }) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Unauthorized");
	}

	const [message] = await getMessageById({ id });

	if (!message) {
		console.warn(
			`Message with id ${id} not found for deletion of trailing messages`,
		);
		return;
	}

	// Verify the chat belongs to the user
	const chat = await getChatById({ id: message.chatId });
	if (!chat || chat.userId !== user.id) {
		throw new Error("Forbidden");
	}

	await deleteMessagesByChatIdAfterTimestamp({
		chatId: message.chatId,
		timestamp: message.createdAt,
	});
}

export async function updateChatVisibility({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: VisibilityType;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("Unauthorized");
	}

	// Verify the chat belongs to the user
	const chat = await getChatById({ id: chatId });
	if (!chat || chat.userId !== user.id) {
		throw new Error("Forbidden");
	}

	await updateChatVisiblityById({ chatId, visibility });
}
