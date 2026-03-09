import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChatWithErrorBoundary } from "@/components/chat-with-error-boundary";
import { DataStreamHandlerWrapper } from "@/components/data-stream-handler-wrapper";
import type { VisibilityType } from "@/components/visibility-selector";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { BotType } from "@/lib/bot-personalities";
import {
	getChatById,
	getMessageCountByChatId,
	getMessagesByChatId,
} from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { convertToUIMessages } from "@/lib/utils";

const INITIAL_MESSAGE_LIMIT = 50;

// Type guard for BotType validation
function isBotType(value: unknown): value is BotType {
	return (
		typeof value === "string" &&
		["alexandria", "kim", "collaborative"].includes(value)
	);
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const { id } = params;

	// Parallel: fetch chat and create auth client at the same time
	const [chat, supabase] = await Promise.all([
		getChatById({ id }),
		createClient(),
	]);

	if (!chat) {
		notFound();
	}

	const {
		data: { user: sessionUser },
	} = await supabase.auth.getUser();

	if (!sessionUser) {
		redirect("/login");
	}

	if (chat.visibility === "private" && sessionUser.id !== chat.userId) {
		return notFound();
	}

	// Parallel: fetch messages, count, and cookies simultaneously
	const [messagesFromDb, totalMessageCount, cookieStore] = await Promise.all([
		getMessagesByChatId({ id, limit: INITIAL_MESSAGE_LIMIT }),
		getMessageCountByChatId({ id }),
		cookies(),
	]);

	const uiMessages = convertToUIMessages(messagesFromDb);
	const hasMoreMessages = totalMessageCount > messagesFromDb.length;
	const chatModelFromCookie = cookieStore.get("chat-model");

	// Get the bot type from the last assistant message with type safety
	const lastAssistantMessage = messagesFromDb
		.filter((m) => m.role === "assistant")
		.at(-1);
	const initialBotType: BotType = isBotType(lastAssistantMessage?.botType)
		? lastAssistantMessage.botType
		: "collaborative";

	const isReadonly = sessionUser.id !== chat.userId;

	return (
		<>
			<ChatWithErrorBoundary
				autoResume={true}
				chatTopic={chat.topic || chat.title}
				hasMoreMessages={hasMoreMessages}
				id={chat.id}
				initialBotType={initialBotType}
				initialChatModel={chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL}
				initialLastContext={(chat.lastContext as any) ?? undefined}
				initialMessages={uiMessages}
				initialVisibilityType={chat.visibility as VisibilityType}
				isReadonly={isReadonly}
			/>
			<DataStreamHandlerWrapper />
		</>
	);
}
