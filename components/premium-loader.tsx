"use client";

import { motion } from "framer-motion";
import { Brain } from "lucide-react";

interface PremiumLoaderProps {
  message?: string;
  showLogo?: boolean;
}

export function PremiumLoader({
  message = "Loading...",
  showLogo = true,
}: PremiumLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Brain icon with red border, no background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          {/* Pulsing ring around brain */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-2xl border-2 border-red-500/40"
          />

          {/* Brain icon container with red border */}
          <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-red-500 bg-transparent">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain className="size-8 text-red-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Loading text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      </div>
    </div>
  );
}

// Mini loader for inline use
export function MiniLoader({ className = "" }: { className?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={`w-5 h-5 rounded-full border-2 border-red-500/20 border-t-red-500 ${className}`}
    />
  );
}

// Skeleton with shimmer effect
export function PremiumSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-white/5 ${className}`}
    >
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="p-4 glass-dark rounded-xl space-y-3">
      <PremiumSkeleton className="h-4 w-3/4" />
      <PremiumSkeleton className="h-4 w-1/2" />
      <PremiumSkeleton className="h-20 w-full" />
    </div>
  );
}

// Message skeleton
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <PremiumSkeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <PremiumSkeleton className="h-4 w-24" />
        <PremiumSkeleton className="h-4 w-full" />
        <PremiumSkeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

// Sidebar item skeleton
export function SidebarItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <PremiumSkeleton className="h-4 w-4 rounded" />
      <PremiumSkeleton className="h-4 flex-1" />
    </div>
  );
}
