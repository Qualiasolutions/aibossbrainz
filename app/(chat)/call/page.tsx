"use client";

import { ArrowLeft, Mic, Radio, Zap } from "lucide-react";
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
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-neutral-100 px-8 py-5">
        <Link
          className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-900"
          href="/new"
        >
          <ArrowLeft className="size-4" />
          <span className="text-sm font-medium tracking-wide uppercase">
            Back
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
            Voice Consultation
          </p>
          <h1 className="mb-4 text-4xl font-light tracking-tight text-neutral-900 md:text-5xl">
            Speak with an Executive
          </h1>
          <p className="mx-auto max-w-md text-base text-neutral-500 leading-relaxed">
            Real-time voice consultation with our AI executives.
            Select who you want to speak with.
          </p>
        </div>

        {/* Executive Selection */}
        <div className="grid w-full max-w-4xl gap-5 md:grid-cols-3">
          {(["alexandria", "kim", "collaborative"] as BotType[]).map(
            (botType) => {
              const bot = BOT_PERSONALITIES[botType];
              return (
                <button
                  key={botType}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-8 text-left transition-all duration-300",
                    "hover:border-neutral-300 hover:shadow-xl hover:shadow-neutral-200/50 hover:-translate-y-1",
                    "focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2",
                  )}
                  onClick={() => handleStartCall(botType)}
                  type="button"
                >
                  {/* Content */}
                  <div className="relative">
                    {/* Avatar */}
                    <div className="mb-6 size-20 overflow-hidden rounded-2xl bg-neutral-100">
                      {bot.avatar ? (
                        <Image
                          alt={bot.name}
                          className="size-full object-cover"
                          height={80}
                          src={bot.avatar}
                          width={80}
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex size-full items-center justify-center bg-gradient-to-br",
                            bot.color,
                          )}
                        >
                          <span className="font-semibold text-xl text-white">
                            {botType === "collaborative"
                              ? "A&K"
                              : bot.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <h2 className="mb-1 text-lg font-semibold text-neutral-900">
                      {bot.name}
                    </h2>
                    <p className="mb-3 text-xs font-medium tracking-wide uppercase text-red-700">
                      {bot.role}
                    </p>
                    <p className="line-clamp-2 text-sm text-neutral-500 leading-relaxed">
                      {bot.description}
                    </p>

                    {/* Call indicator */}
                    <div className="mt-6 flex items-center gap-2">
                      <div className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-neutral-400 tracking-wide uppercase">
                        Available
                      </span>
                    </div>
                  </div>
                </button>
              );
            },
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid max-w-2xl gap-12 text-center md:grid-cols-3">
          <div>
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-neutral-100">
              <Mic className="size-4 text-neutral-600" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-900">
              Natural Speech
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Speak naturally, AI responds in real-time
            </p>
          </div>
          <div>
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-neutral-100">
              <Radio className="size-4 text-neutral-600" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-900">
              Distinct Voices
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Each executive has their own unique voice
            </p>
          </div>
          <div>
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-neutral-100">
              <Zap className="size-4 text-neutral-600" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-neutral-900">
              Low Latency
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Streaming responses for fast conversations
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
