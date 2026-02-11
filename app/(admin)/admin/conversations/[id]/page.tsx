import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Crown, Sparkles, User, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getChatWithMessages } from "@/lib/admin/queries";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const executiveConfig: Record<
  string,
  { name: string; color: string; bgColor: string; icon: typeof Sparkles }
> = {
  alexandria: {
    name: "Alexandria",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    icon: Sparkles,
  },
  kim: {
    name: "Kim",
    color: "text-red-600",
    bgColor: "bg-red-50",
    icon: Crown,
  },
  collaborative: {
    name: "Collaborative",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    icon: Users,
  },
};

function extractTextFromParts(parts: Json): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(
      (part): part is { type: string; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part,
    )
    .map((part) => part.text)
    .join("\n");
}

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getChatWithMessages(id);

  if (!data) {
    notFound();
  }

  const { chat, messages } = data;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/conversations">
          <Button
            variant="ghost"
            className="mb-4 text-neutral-500 hover:text-neutral-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Conversations
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900">
          {chat.title || "Untitled Conversation"}
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
          <span>User: {chat.userEmail}</span>
          <span>|</span>
          <span>
            Created{" "}
            {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
          </span>
          {chat.topic && (
            <>
              <span>|</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: chat.topicColor
                    ? `${chat.topicColor}20`
                    : undefined,
                  color: chat.topicColor || undefined,
                }}
              >
                {chat.topic}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-neutral-200 px-6 py-4 bg-neutral-50">
          <h2 className="text-lg font-semibold text-neutral-900">
            Messages ({messages.length})
          </h2>
        </div>
        <div className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="p-6 text-center text-neutral-500">
              No messages in this conversation
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              const exec = executiveConfig[message.botType || ""] || {
                name: "Assistant",
                color: "text-neutral-500",
                bgColor: "bg-neutral-100",
                icon: Sparkles,
              };
              const Icon = isUser ? User : exec.icon;
              const text = extractTextFromParts(message.parts);

              return (
                <div
                  key={message.id}
                  className={cn(
                    "px-6 py-4",
                    isUser ? "bg-white" : "bg-neutral-50/50",
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        isUser ? "bg-neutral-200" : exec.bgColor,
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isUser ? "text-neutral-600" : exec.color,
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isUser ? "text-neutral-700" : exec.color,
                          )}
                        >
                          {isUser ? "User" : exec.name}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-700 whitespace-pre-wrap break-words">
                        {text || (
                          <span className="text-neutral-400 italic">
                            [No text content]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
