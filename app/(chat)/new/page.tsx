import { cookies } from "next/headers";
import { ChatWithErrorBoundary } from "@/components/chat-with-error-boundary";
import { DataStreamHandlerWrapper } from "@/components/data-stream-handler-wrapper";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

export default async function Page() {
	const id = generateUUID();
	const cookieStore = await cookies();
	const modelIdFromCookie = cookieStore.get("chat-model");

	return (
		<>
			<ChatWithErrorBoundary
				autoResume={false}
				id={id}
				initialChatModel={modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL}
				initialMessages={[]}
				initialVisibilityType="private"
				isReadonly={false}
				key={id}
			/>
			<DataStreamHandlerWrapper />
		</>
	);
}
