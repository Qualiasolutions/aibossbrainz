"use client";

import type { User } from "@supabase/supabase-js";
import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { Clock, Filter, Search, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCsrf } from "@/hooks/use-csrf";
import { getTopicCategories } from "@/lib/ai/topic-classifier";
import type { Chat } from "@/lib/supabase/types";
import { fetcher } from "@/lib/utils";
import { LoaderIcon } from "./icons";
import { ChatItem } from "./sidebar-history-item";

type GroupedChats = {
  pinned: Chat[];
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

export type ChatHistory = {
  chats: Chat[];
  hasMore: boolean;
};

const PAGE_SIZE = 20;

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      // Pinned chats go to their own section at the top
      if (chat.isPinned) {
        groups.pinned.push(chat);
        return groups;
      }

      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) {
    return `/api/history?limit=${PAGE_SIZE}`;
  }

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) {
    return null;
  }

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { csrfFetch } = useCsrf();
  const { id } = useParams();

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
    onError: (err) => {
      // Handle session expiration gracefully
      if (err?.status === 401 || err?.status === 403) {
        console.warn("[Sidebar History] Session expired, redirecting to login");
        toast.error("Your session has expired. Please log in again.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    },
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const topicCategories = useMemo(() => getTopicCategories(), []);

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  // Set up IntersectionObserver for infinite scroll with proper cleanup
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isValidating && !hasReachedEnd) {
          setSize((size) => size + 1);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [isValidating, hasReachedEnd, setSize]);

  // Filter chats by search query and topic (client-side for speed)
  const filteredChats = useMemo(() => {
    if (!paginatedChatHistories) return [];
    let allChats = paginatedChatHistories.flatMap((page) => page.chats);

    // Filter by topic first
    if (topicFilter) {
      allChats = allChats.filter((chat) => chat.topic === topicFilter);
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allChats = allChats.filter((chat) =>
        chat.title.toLowerCase().includes(query),
      );
    }

    return allChats;
  }, [paginatedChatHistories, searchQuery, topicFilter]);

  const groupedChats = useMemo(
    () => groupChatsByDate(filteredChats),
    [filteredChats],
  );

  const handleDelete = useCallback(() => {
    const deletePromise = csrfFetch(`/api/chat?id=${deleteId}`, {
      method: "DELETE",
    });

    toast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push("/new");
    }
  }, [csrfFetch, deleteId, id, mutate, router]);

  const handlePinToggle = useCallback(
    async (chatId: string, isPinned: boolean) => {
      // Optimistically update the SWR cache
      mutate(
        (chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.map((chat) =>
                chat.id === chatId ? { ...chat, isPinned } : chat,
              ),
            }));
          }
        },
        { revalidate: false },
      );

      try {
        const response = await csrfFetch("/api/chat", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: chatId, isPinned }),
        });

        if (!response.ok) {
          throw new Error("Failed to update pin status");
        }
      } catch (_error) {
        // Rollback on failure
        mutate(
          (chatHistories) => {
            if (chatHistories) {
              return chatHistories.map((chatHistory) => ({
                ...chatHistory,
                chats: chatHistory.chats.map((chat) =>
                  chat.id === chatId ? { ...chat, isPinned: !isPinned } : chat,
                ),
              }));
            }
          },
          { revalidate: false },
        );
        toast.error(isPinned ? "Failed to pin chat" : "Failed to unpin chat");
      }
    },
    [csrfFetch, mutate],
  );

  const onDeleteRequest = useCallback((chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  }, []);

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-6 text-center text-neutral-600 text-sm">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-3 py-1 font-semibold text-[11px] text-red-600 uppercase tracking-[0.25em]">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                className="flex h-8 items-center gap-2 rounded-lg px-2"
                key={item}
              >
                <div
                  className="h-4 flex-1 animate-pulse rounded-full bg-neutral-200"
                  style={{ maxWidth: `${item}%` }}
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="flex w-full flex-row items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-6 text-center text-neutral-600 text-sm">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {/* Search and Filter */}
      <div className="px-2 pb-2 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            className="h-9 w-full rounded-lg border border-neutral-200 bg-white pr-8 pl-8 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            type="text"
            value={searchQuery}
          />
          {searchQuery && (
            <button
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-neutral-500 hover:text-red-600"
              onClick={() => setSearchQuery("")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSearchQuery("");
                }
              }}
              type="button"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Topic Filter */}
        <div className="relative">
          <button
            className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:border-red-400 hover:bg-red-50/30 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-500/30"
            onClick={() => setShowTopicDropdown(!showTopicDropdown)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowTopicDropdown(!showTopicDropdown);
              }
            }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Filter className="size-3.5 text-neutral-500" />
              {topicFilter ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={`size-2 rounded-full ${topicCategories.find((t) => t.name === topicFilter)?.color || "bg-gray-400"}`}
                  />
                  <span className="text-neutral-800">{topicFilter}</span>
                </span>
              ) : (
                <span className="text-neutral-500">Filter by topic</span>
              )}
            </div>
            {topicFilter ? (
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm p-0.5 text-neutral-500 hover:text-red-600 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setTopicFilter(null);
                  setShowTopicDropdown(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setTopicFilter(null);
                    setShowTopicDropdown(false);
                  }
                }}
              >
                <X className="size-3.5" />
              </span>
            ) : (
              <svg
                className={`size-3.5 text-neutral-400 transition-transform ${showTopicDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M19 9l-7 7-7-7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            )}
          </button>

          {showTopicDropdown && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-xl shadow-neutral-200/50">
              {topicCategories.map((topic) => (
                <button
                  key={topic.name}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-800 hover:bg-red-50 hover:text-red-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  onClick={() => {
                    setTopicFilter(topic.name);
                    setShowTopicDropdown(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setTopicFilter(topic.name);
                      setShowTopicDropdown(false);
                    }
                  }}
                  type="button"
                >
                  <span className={`size-2.5 rounded-full ${topic.color}`} />
                  <span>{topic.name}</span>
                  {topicFilter === topic.name && (
                    <svg
                      className="ml-auto size-4 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {paginatedChatHistories &&
              ((searchQuery.trim() || topicFilter) &&
              filteredChats.length === 0 ? (
                <div className="px-3 py-6 text-center text-neutral-500 text-sm">
                  {topicFilter && searchQuery.trim()
                    ? `No ${topicFilter} conversations match "${searchQuery}"`
                    : topicFilter
                      ? `No ${topicFilter} conversations found`
                      : `No conversations match "${searchQuery}"`}
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {groupedChats.pinned.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 py-1 font-semibold text-[11px] text-red-600 uppercase tracking-[0.25em]">
                        <svg
                          className="size-3 fill-red-500"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        Pinned
                      </div>
                      {groupedChats.pinned.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.pinned.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedChats.today.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-neutral-500 font-semibold text-xs uppercase tracking-wide">
                        Today
                      </div>
                      {groupedChats.today.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.today.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedChats.yesterday.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-neutral-500 font-semibold text-xs uppercase tracking-wide">
                        Yesterday
                      </div>
                      {groupedChats.yesterday.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.yesterday.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedChats.lastWeek.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-neutral-500 font-semibold text-xs uppercase tracking-wide">
                        Last 7 days
                      </div>
                      {groupedChats.lastWeek.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.lastWeek.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedChats.lastMonth.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-neutral-500 font-semibold text-xs uppercase tracking-wide">
                        Last 30 days
                      </div>
                      {groupedChats.lastMonth.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.lastMonth.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {groupedChats.older.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-neutral-500 font-semibold text-xs uppercase tracking-wide">
                        Older than last month
                      </div>
                      {groupedChats.older.map((chat, index) => (
                        <div key={chat.id}>
                          <ChatItem
                            chat={chat}
                            isActive={chat.id === id}
                            onDelete={onDeleteRequest}
                            onPinToggle={handlePinToggle}
                            setOpenMobile={setOpenMobile}
                          />
                          {index < groupedChats.older.length - 1 && (
                            <div className="relative mx-3 my-2">
                              <div className="absolute inset-0 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </SidebarMenu>

          <div className="h-4" ref={loadMoreRef} />

          {/* View Full History Link */}
          <Link
            href="/history"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/30"
          >
            <Clock className="size-4" />
            <span>View Full History</span>
          </Link>

          {hasReachedEnd ? (
            <div className="mt-4 flex w-full flex-row items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-neutral-500 text-sm">
              You've reached the end of your chat history.
            </div>
          ) : (
            <div className="mt-4 flex flex-row items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-4 text-neutral-500 text-sm">
              <div className="animate-spin text-red-500">
                <LoaderIcon />
              </div>
              <div>Loading conversations…</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
