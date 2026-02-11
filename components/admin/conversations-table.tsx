"use client";

import { formatDistanceToNow } from "date-fns";
import { Eye, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminChat } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

interface ConversationsTableProps {
  conversations: AdminChat[];
}

const topicColors: Record<string, string> = {
  Marketing: "bg-rose-50 text-rose-600",
  Sales: "bg-red-50 text-red-600",
  Strategy: "bg-purple-50 text-purple-600",
  Brand: "bg-pink-50 text-pink-600",
  Growth: "bg-emerald-50 text-emerald-600",
  default: "bg-neutral-100 text-neutral-500",
};

export function ConversationsTable({ conversations }: ConversationsTableProps) {
  const [search, setSearch] = useState("");

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(search.toLowerCase()) ||
      conv.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      conv.topic?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Conversation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Topic
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Messages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredConversations.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-neutral-500"
                >
                  No conversations found
                </td>
              </tr>
            ) : (
              filteredConversations.map((conv) => (
                <tr
                  key={conv.id}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-neutral-100 p-2">
                        <MessageSquare className="h-4 w-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 truncate max-w-xs">
                          {conv.title || "Untitled"}
                        </p>
                        <p className="text-xs text-neutral-400 font-mono">
                          {conv.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-700">{conv.userEmail}</p>
                  </td>
                  <td className="px-6 py-4">
                    {conv.topic ? (
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-xs font-medium rounded-full",
                          topicColors[conv.topic] || topicColors.default,
                        )}
                      >
                        {conv.topic}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-700">
                      {conv.messageCount}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-500">
                      {formatDistanceToNow(new Date(conv.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/conversations/${conv.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-neutral-500 hover:text-neutral-900"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
