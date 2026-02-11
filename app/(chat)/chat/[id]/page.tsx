import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChatWithErrorBoundary } from "@/components/chat-with-error-boundary";
import { DataStreamHandler } from "@/components/data-stream-handler";
import type { VisibilityType } from "@/components/visibility-selector";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import type { BotType } from "@/lib/bot-personalities";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";
import { convertToUIMessages } from "@/lib/utils";

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
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  if (!sessionUser) {
    redirect("/login");
  }

  if (chat.visibility === "private") {
    if (!sessionUser) {
      return notFound();
    }

    if (sessionUser.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  // Get the bot type from the last assistant message with type safety
  const lastAssistantMessage = messagesFromDb
    .filter((m) => m.role === "assistant")
    .at(-1);
  const initialBotType: BotType = isBotType(lastAssistantMessage?.botType)
    ? lastAssistantMessage.botType
    : "collaborative";

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");

  if (!chatModelFromCookie) {
    return (
      <>
        <ChatWithErrorBoundary
          autoResume={true}
          id={chat.id}
          initialBotType={initialBotType}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialLastContext={(chat.lastContext as any) ?? undefined}
          initialMessages={uiMessages}
          initialVisibilityType={chat.visibility as VisibilityType}
          isReadonly={sessionUser?.id !== chat.userId}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <ChatWithErrorBoundary
        autoResume={true}
        id={chat.id}
        initialBotType={initialBotType}
        initialChatModel={chatModelFromCookie.value}
        initialLastContext={(chat.lastContext as any) ?? undefined}
        initialMessages={uiMessages}
        initialVisibilityType={chat.visibility as VisibilityType}
        isReadonly={sessionUser?.id !== chat.userId}
      />
      <DataStreamHandler />
    </>
  );
}
