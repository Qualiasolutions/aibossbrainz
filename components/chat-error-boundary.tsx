"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ErrorBoundary } from "./error-boundary";
import { Button } from "./ui/button";

interface ChatErrorFallbackProps {
  onReset: () => void;
}

function ChatErrorFallback({ onReset }: ChatErrorFallbackProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-500/20">
          <AlertTriangle className="size-8 text-red-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Chat Error</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Something went wrong while loading the chat. This could be a
            temporary issue. Please try again or start a new conversation.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onReset} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Try Again
          </Button>
          <Button asChild variant="default" className="gap-2">
            <Link href="/new">
              <Home className="size-4" />
              New Chat
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ChatErrorBoundaryProps {
  children: ReactNode;
}

export function ChatErrorBoundary({ children }: ChatErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<ChatErrorFallback onReset={() => window.location.reload()} />}
      onError={(error, errorInfo) => {
        // Log to console in development, could send to error tracking in production
        console.error("Chat error:", error);
        console.error("Component stack:", errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
