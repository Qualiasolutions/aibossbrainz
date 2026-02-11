"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EmbedPage() {
  const router = useRouter();
  const [_isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to create guest session and redirect to chat
    const initGuestSession = async () => {
      try {
        // First check if we already have a session
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user) {
          // Already logged in, go to chat
          router.push("/new");
          return;
        }

        // Create guest session
        const guestRes = await fetch("/api/auth/guest", {
          redirect: "manual",
        });

        if (guestRes.type === "opaqueredirect" || guestRes.ok) {
          // Redirect happened or success, refresh to get the session
          window.location.href = "/";
        } else {
          setError("Failed to create session");
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Embed auth error:", err);
        setError("Failed to initialize chat");
        setIsLoading(false);
      }
    };

    initGuestSession();
  }, [router]);

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-stone-50 to-white">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button
            className="mt-4 rounded-lg bg-rose-500 px-4 py-2 text-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-stone-50 to-white">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 animate-spin rounded-full border-4 border-rose-200 border-t-rose-500" />
        <p className="text-stone-600">Loading chat...</p>
      </div>
    </div>
  );
}
