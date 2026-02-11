"use client";

import { formatDistanceToNow } from "date-fns";
import { ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";

export interface ConversationPreviewData {
  id: string;
  title: string;
  userEmail: string;
  messageCount: number;
  topic: string | null;
  topicColor: string | null;
  createdAt: string;
}

interface ConversationsPreviewProps {
  conversations: ConversationPreviewData[];
}

export function ConversationsPreview({
  conversations,
}: ConversationsPreviewProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm h-full flex flex-col">
      <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">
          Recent Conversations
        </h2>
        <Link
          href="/admin/conversations"
          className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-medium"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1 divide-y divide-neutral-100 overflow-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-neutral-500">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/admin/conversations/${conv.id}`}
              className="flex items-start gap-4 px-6 py-3 transition-colors hover:bg-neutral-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {conv.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-500 truncate">
                    {conv.userEmail}
                  </span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-xs text-neutral-500">
                    {conv.messageCount} messages
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-neutral-400">
                  {formatDistanceToNow(new Date(conv.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {conv.topic && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: conv.topicColor
                        ? `${conv.topicColor}20`
                        : "#f5f5f5",
                      color: conv.topicColor || "#525252",
                    }}
                  >
                    {conv.topic}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
