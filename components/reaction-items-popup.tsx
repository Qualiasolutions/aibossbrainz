"use client";

import { format } from "date-fns";
import {
  Bookmark,
  CalendarDays,
  Crown,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ReactionType = "actionable" | "needs_clarification" | "save_for_later";

interface ReactionItem {
  id: string;
  messageId: string;
  reactionType: string;
  createdAt: string;
  message: {
    id: string;
    chatId: string;
    parts: unknown;
    role: string;
    botType: string | null;
    createdAt: string;
  } | null;
  chat: {
    id: string;
    title: string;
    topic: string | null;
    topicColor: string | null;
  } | null;
}

interface ReactionItemsPopupProps {
  type: ReactionType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIG: Record<
  ReactionType,
  {
    title: string;
    icon: typeof Lightbulb;
    emptyTitle: string;
    emptyDescription: string;
    gradient: string;
    iconBg: string;
    badgeClass: string;
    badgeLabel: string;
  }
> = {
  actionable: {
    title: "Action Items",
    icon: Lightbulb,
    emptyTitle: "No action items yet",
    emptyDescription:
      "Mark messages as actionable to track tasks and next steps",
    gradient: "from-red-500 to-orange-500",
    iconBg: "bg-gradient-to-br from-red-100 to-orange-100",
    badgeClass: "bg-red-100 text-red-700",
    badgeLabel: "Action",
  },
  needs_clarification: {
    title: "Needs Clarification",
    icon: HelpCircle,
    emptyTitle: "No clarifications needed",
    emptyDescription:
      "Mark messages that need more detail or follow-up questions",
    gradient: "from-orange-500 to-amber-500",
    iconBg: "bg-gradient-to-br from-orange-100 to-amber-100",
    badgeClass: "bg-orange-100 text-orange-700",
    badgeLabel: "Clarify",
  },
  save_for_later: {
    title: "Saved for Later",
    icon: Bookmark,
    emptyTitle: "No saved items yet",
    emptyDescription:
      "Bookmark messages from your conversations to save them here",
    gradient: "from-blue-500 to-indigo-500",
    iconBg: "bg-gradient-to-br from-blue-100 to-indigo-100",
    badgeClass: "bg-blue-100 text-blue-700",
    badgeLabel: "Saved",
  },
};

const getBotIcon = (botType?: string | null) => {
  switch (botType) {
    case "alexandria":
      return <Crown className="h-4 w-4 text-rose-600" />;
    case "kim":
      return <TrendingUp className="h-4 w-4 text-red-600" />;
    case "collaborative":
      return <Users className="h-4 w-4 text-purple-600" />;
    default:
      return <MessageSquare className="h-4 w-4 text-slate-400" />;
  }
};

const getBotBadge = (botType?: string | null) => {
  switch (botType) {
    case "alexandria":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 font-semibold text-[10px] text-rose-700">
          <Crown className="h-3 w-3" />
          Alexandria
        </span>
      );
    case "kim":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-semibold text-[10px] text-red-700">
          <TrendingUp className="h-3 w-3" />
          Kim
        </span>
      );
    case "collaborative":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-1 font-semibold text-[10px] text-purple-700">
          <Users className="h-3 w-3" />
          Both
        </span>
      );
    default:
      return null;
  }
};

const getMessagePreview = (parts: unknown): string => {
  if (!Array.isArray(parts)) return "No content";
  const textPart = parts.find(
    (p: { type?: string }) => p && typeof p === "object" && p.type === "text",
  );
  if (textPart && "text" in textPart && typeof textPart.text === "string") {
    return (
      textPart.text.slice(0, 150) + (textPart.text.length > 150 ? "..." : "")
    );
  }
  return "No content";
};

export function ReactionItemsPopup({
  type,
  open,
  onOpenChange,
}: ReactionItemsPopupProps) {
  const [items, setItems] = useState<ReactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/reactions?type=${type}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch");
          return res.json();
        })
        .then((data) => {
          setItems(data.items || []);
        })
        .catch(() => {
          setError("Failed to load items");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, type]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="border-b bg-gradient-to-r from-slate-50 to-white p-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                config.gradient,
              )}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">{config.title}</DialogTitle>
              <p className="text-muted-foreground text-sm">
                {items.length} item{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-12 text-center text-muted-foreground">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-slate-100">
                  <Icon className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 font-semibold text-lg text-slate-900">
                  {config.emptyTitle}
                </h3>
                <p className="mt-2 text-slate-600 text-sm">
                  {config.emptyDescription}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <Link
                    href={`/chat/${item.chat?.id || ""}`}
                    key={item.id}
                    onClick={() => onOpenChange(false)}
                  >
                    <div className="group rounded-lg border bg-white p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
                      <div className="flex flex-col gap-2">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full",
                                config.iconBg,
                              )}
                            >
                              {getBotIcon(item.message?.botType)}
                            </div>
                            <div>
                              <h3 className="font-medium text-slate-900 text-sm group-hover:text-primary">
                                {item.chat?.title || "Untitled Chat"}
                              </h3>
                              <div className="flex items-center gap-2 text-slate-500 text-xs">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(
                                    new Date(item.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                {item.chat?.topic && (
                                  <>
                                    <span className="text-slate-300">|</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                      {item.chat.topic}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {getBotBadge(item.message?.botType)}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                                config.badgeClass,
                              )}
                            >
                              <Icon className="h-3 w-3" />
                              {config.badgeLabel}
                            </span>
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div className="rounded-md bg-slate-50 p-2.5 text-slate-600 text-sm">
                          {getMessagePreview(item.message?.parts)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
