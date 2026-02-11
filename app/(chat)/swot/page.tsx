"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Moon, Sparkles, Sun, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SwotBoard } from "@/components/strategy-canvas/swot-board";
import { Button } from "@/components/ui/button";

export default function SwotPage() {
  const [isDark, setIsDark] = useState(false);

  // SSR-safe dark mode detection
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDarkMode = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-purple-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/30" />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute -top-40 -left-40 size-80 rounded-full bg-gradient-to-br from-purple-200/40 to-violet-200/40 blur-3xl dark:from-purple-900/20 dark:to-violet-900/20"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/2 -right-40 size-96 rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/40 blur-3xl dark:from-emerald-900/20 dark:to-teal-900/20"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/3 size-72 rounded-full bg-gradient-to-br from-neutral-200/40 to-rose-200/40 blur-3xl dark:from-neutral-900/20 dark:to-rose-900/20"
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                              linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70">
        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Logo and Back */}
            <div className="flex items-center gap-4">
              <Link href="/new">
                <Button className="gap-2" size="sm" variant="ghost">
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Back to Chat</span>
                </Button>
              </Link>
              <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
              <div className="flex items-center gap-2">
                <Target className="size-5 text-purple-500" />
                <h1 className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text font-bold text-lg text-transparent">
                  SWOT Analysis
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link href="/strategy-canvas">
                <Button className="gap-2" size="sm" variant="outline">
                  <Sparkles className="size-4" />
                  <span className="hidden sm:inline">All Tools</span>
                </Button>
              </Link>
              <button
                className="flex size-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={toggleDarkMode}
                title={isDark ? "Light mode" : "Dark mode"}
                type="button"
              >
                {isDark ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center sm:mb-12"
        >
          <h1 className="mb-3 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text font-bold text-3xl text-transparent dark:from-white dark:via-purple-200 dark:to-white sm:text-4xl lg:text-5xl">
            SWOT Analysis
          </h1>
          <p className="mx-auto max-w-2xl text-slate-600 text-sm dark:text-slate-400 sm:text-base">
            Analyze your Strengths, Weaknesses, Opportunities, and Threats to
            make better strategic decisions.
          </p>
        </motion.div>
      </section>

      {/* SWOT Board */}
      <section className="container mx-auto px-4 pb-12 sm:px-6 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <SwotBoard />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/50 bg-white/50 py-6 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 text-center sm:px-6">
          <p className="text-slate-500 text-sm dark:text-slate-400">
            SWOT Analysis by{" "}
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              Alecci Media
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
