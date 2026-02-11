import { format } from "date-fns";
import {
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
import { getChatsByUserId, getMessagesByChatId } from "@/lib/db/queries";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { chats } = await getChatsByUserId({
    id: user.id,
    limit: 100,
    startingAfter: null,
    endingBefore: null,
  });

  const getBotIcon = (botType?: string) => {
    switch (botType) {
      case "alexandria":
        return <Crown className="h-4 w-4 text-red-600" />;
      case "kim":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "collaborative":
        return <Users className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-slate-400" />;
    }
  };

  const getBotBadge = (botType?: string) => {
    switch (botType) {
      case "alexandria":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 font-semibold text-[10px] text-red-700">
            <Crown className="h-3 w-3" />
            Alexandria
          </span>
        );
      case "kim":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-semibold text-[10px] text-blue-700">
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

  // Calculate analytics from messages
  const totalChats = chats.length;

  // Get message counts per executive by analyzing messages
  const chatStats = await Promise.all(
    chats.map(async (chat) => {
      const msgs = await getMessagesByChatId({ id: chat.id });

      const botCounts = msgs.reduce(
        (acc, msg) => {
          const botType = (msg as any).botType || "collaborative";
          acc[botType] = (acc[botType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const primaryBot = Object.entries(botCounts).reduce(
        (max, [bot, count]) =>
          (count as number) > (max.count || 0)
            ? { bot, count: count as number }
            : max,
        { bot: "alexandria" as string, count: 0 },
      ).bot;

      return {
        ...chat,
        primaryBot,
        messageCount: msgs.length,
      };
    }),
  );

  const botDistribution = chatStats.reduce(
    (acc, chat) => {
      acc[chat.primaryBot] = (acc[chat.primaryBot] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-white/20 border-b bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-bold text-2xl text-slate-900 sm:text-3xl">
                Conversation History
              </h1>
              <p className="mt-1 text-slate-600 text-sm">
                Review your past consulting sessions
              </p>
            </div>
            <Link href="/new">
              <Button className="w-full sm:w-auto" variant="outline">
                Back to Chat
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Analytics Section */}
      <section className="border-white/20 border-b bg-white/40 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-0 bg-gradient-to-br from-white to-rose-50/50 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 sm:size-12">
                    <MessageSquare className="h-5 w-5 text-rose-600 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">
                      Total Conversations
                    </p>
                    <p className="font-bold text-slate-900 text-xl sm:text-2xl">
                      {totalChats}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-red-50/50 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-red-100 sm:size-12">
                    <Crown className="h-5 w-5 text-red-600 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">
                      Alexandria Sessions
                    </p>
                    <p className="font-bold text-slate-900 text-xl sm:text-2xl">
                      {botDistribution.alexandria || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-blue-50/50 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 sm:size-12">
                    <TrendingUp className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">
                      Kim Sessions
                    </p>
                    <p className="font-bold text-slate-900 text-xl sm:text-2xl">
                      {botDistribution.kim || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-gradient-to-br from-white to-purple-50/50 shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-purple-100 sm:size-12">
                    <Users className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-slate-600 text-xs sm:text-sm">
                      Collaborative
                    </p>
                    <p className="font-bold text-slate-900 text-xl sm:text-2xl">
                      {botDistribution.collaborative || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Conversations List */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {chats.length === 0 ? (
            <Card className="border-0 bg-white/80 shadow-xl">
              <CardContent className="p-8 text-center sm:p-12">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-300 sm:h-16 sm:w-16" />
                <h3 className="mt-4 font-semibold text-lg text-slate-900 sm:text-xl">
                  No conversations yet
                </h3>
                <p className="mt-2 text-slate-600 text-sm sm:text-base">
                  Start your first conversation with our executive consultants
                </p>
                <Link href="/new">
                  <Button className="mt-6">Start New Conversation</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {chatStats.map((chat) => (
                <Link href={`/chat/${chat.id}`} key={chat.id}>
                  <Card className="group hover:-translate-y-1 border-0 bg-white/80 shadow-md transition-all duration-200 hover:shadow-xl">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-purple-100">
                              {getBotIcon(chat.primaryBot)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-semibold text-base text-slate-900 group-hover:text-rose-600 sm:text-lg">
                                {chat.title}
                              </h3>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500 text-xs sm:text-sm">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3 sm:h-4 sm:w-4" />
                                  {format(
                                    new Date(chat.createdAt),
                                    "MMM d, yyyy",
                                  )}
                                </span>
                                <span>•</span>
                                <span>
                                  {format(new Date(chat.createdAt), "h:mm a")}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                                  {chat.messageCount} messages
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getBotBadge(chat.primaryBot)}
                          <span
                            className={`rounded-full px-2 py-1 font-semibold text-[10px] uppercase ${
                              chat.visibility === "private"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {chat.visibility}
                          </span>
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
