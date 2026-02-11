"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PremiumRealtimeCall } from "@/components/premium-realtime-call";
import type { BotType } from "@/lib/bot-personalities";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { cn } from "@/lib/utils";

export default function CallPage() {
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const router = useRouter();

  const handleStartCall = (bot: BotType) => {
    setSelectedBot(bot);
    setIsInCall(true);
  };

  const handleEndCall = (chatId?: string) => {
    setIsInCall(false);
    setSelectedBot(null);

    // If we have a chatId, navigate to it
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
  };

  if (isInCall && selectedBot) {
    return (
      <PremiumRealtimeCall botType={selectedBot} onEndCall={handleEndCall} />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-stone-900 via-stone-950 to-black">
      {/* Header */}
      <header className="flex items-center gap-4 p-6">
        <Link
          className="flex items-center gap-2 text-stone-400 transition-colors hover:text-white"
          href="/new"
        >
          <ArrowLeft className="size-5" />
          <span className="text-sm">Back to Chat</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="mb-12 text-center">
          <h1 className="mb-3 bg-gradient-to-r from-rose-400 via-pink-400 to-red-400 bg-clip-text font-bold text-4xl text-transparent md:text-5xl">
            Voice Consultation
          </h1>
          <p className="max-w-md text-stone-400 text-lg">
            Have a real-time conversation with our AI executives. Select who you
            want to speak with.
          </p>
        </div>

        {/* Executive Selection */}
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-3">
          {(["alexandria", "kim", "collaborative"] as BotType[]).map(
            (botType) => {
              const bot = BOT_PERSONALITIES[botType];
              return (
                <button
                  key={botType}
                  className={cn(
                    "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm transition-all duration-300",
                    "hover:border-white/20 hover:bg-white/10 hover:scale-[1.02]",
                    "focus:outline-none focus:ring-2 focus:ring-rose-500/50",
                  )}
                  onClick={() => handleStartCall(botType)}
                  type="button"
                >
                  {/* Gradient overlay */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-10 transition-opacity group-hover:opacity-20",
                      bot.color,
                    )}
                  />

                  {/* Content */}
                  <div className="relative">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
                        bot.color,
                      )}
                    >
                      {bot.avatar ? (
                        <Image
                          alt={bot.name}
                          className="size-full rounded-2xl object-cover"
                          height={80}
                          src={bot.avatar}
                          width={80}
                        />
                      ) : (
                        <span className="font-bold text-2xl text-white">
                          {botType === "collaborative"
                            ? "A&K"
                            : bot.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <h2 className="mb-1 font-semibold text-white text-xl">
                      {bot.name}
                    </h2>
                    <p className="mb-3 text-rose-400/80 text-sm">{bot.role}</p>
                    <p className="line-clamp-2 text-sm text-stone-400">
                      {bot.description}
                    </p>

                    {/* Call indicator */}
                    <div className="mt-6 flex items-center gap-2 text-emerald-400">
                      <div className="size-2 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-sm">Available for call</span>
                    </div>
                  </div>
                </button>
              );
            },
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid max-w-2xl gap-8 text-center md:grid-cols-3">
          <div>
            <div className="mb-2 text-2xl">🎙️</div>
            <h3 className="mb-1 font-medium text-white">Natural Speech</h3>
            <p className="text-sm text-stone-500">
              Speak naturally, AI responds in real-time
            </p>
          </div>
          <div>
            <div className="mb-2 text-2xl">🔊</div>
            <h3 className="mb-1 font-medium text-white">Distinct Voices</h3>
            <p className="text-sm text-stone-500">
              Each executive has their own unique voice
            </p>
          </div>
          <div>
            <div className="mb-2 text-2xl">⚡</div>
            <h3 className="mb-1 font-medium text-white">Low Latency</h3>
            <p className="text-sm text-stone-500">
              Streaming responses for fast conversations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
