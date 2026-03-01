import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";
import { generateUUID } from "@/lib/utils";

const ChatWithErrorBoundary = dynamic(
	() =>
		import("@/components/chat-with-error-boundary").then(
			(mod) => mod.ChatWithErrorBoundary,
		),
	{
		loading: () => (
			<div className="flex items-center justify-center h-screen">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
			</div>
		),
	},
);

export default async function Page() {
	const supabase = await createClient();
	const {
		data: { user: sessionUser },
	} = await supabase.auth.getUser();

	if (!sessionUser) {
		redirect("/login");
	}

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
			<DataStreamHandler />
		</>
	);
}
