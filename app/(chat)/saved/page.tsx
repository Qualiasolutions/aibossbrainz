import { format } from "date-fns";
import {
  Bookmark,
  CalendarDays,
  Crown,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserReactionsByType } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const savedItems = await getUserReactionsByType({
    userId: user.id,
    reactionType: "save_for_later",
  });

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
        textPart.text.slice(0, 200) + (textPart.text.length > 200 ? "..." : "")
      );
    }
    return "No content";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-white/20 border-b bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/25">
                <Bookmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-2xl text-slate-900 sm:text-3xl">
                  Saved for Later
                </h1>
                <p className="mt-1 text-slate-600 text-sm">
                  {savedItems.length} item{savedItems.length !== 1 ? "s" : ""}{" "}
                  bookmarked for future reference
                </p>
              </div>
            </div>
            <Link href="/new">
              <Button className="w-full sm:w-auto" variant="outline">
                Back to Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {savedItems.length === 0 ? (
            <Card className="border-0 bg-white/80 shadow-xl">
              <CardContent className="p-8 text-center sm:p-12">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-100">
                  <Bookmark className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="mt-4 font-semibold text-lg text-slate-900 sm:text-xl">
                  No saved items yet
                </h3>
                <p className="mt-2 text-slate-600 text-sm sm:text-base">
                  Bookmark messages from your conversations to save them here
                  for later reference
                </p>
                <Link href="/new">
                  <Button className="mt-6 bg-blue-500 hover:bg-blue-600">
                    Start a Conversation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {savedItems.map((item) => (
                <Link href={`/chat/${item.chat?.id || ""}`} key={item.id}>
                  <Card className="group hover:-translate-y-1 border-0 bg-white/80 shadow-md transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100">
                              {getBotIcon(item.message?.botType)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 sm:text-lg">
                                {item.chat?.title || "Untitled Chat"}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-500 text-xs sm:text-sm">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                                  {format(
                                    new Date(item.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                {item.chat?.topic && (
                                  <>
                                    <span>•</span>
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                                      {item.chat.topic}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getBotBadge(item.message?.botType)}
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">
                              <Bookmark className="h-3 w-3" />
                              Saved
                            </span>
                          </div>
                        </div>

                        {/* Message Preview */}
                        <div className="rounded-lg bg-slate-50 p-3 text-slate-700 text-sm">
                          {getMessagePreview(item.message?.parts)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
