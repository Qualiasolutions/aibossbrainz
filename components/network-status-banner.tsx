"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

/**
 * Network status banner that shows when connection is lost or restored.
 * Uses the browser's Navigator.onLine API and listens for online/offline events.
 *
 * Shows at the top of the screen with appropriate styling:
 * - Red banner when offline
 * - Green banner when restored (auto-dismisses after 5 seconds)
 */
export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Don't show on public/demo pages where network status is less critical
  const isProtectedRoute = pathname?.startsWith("/chat") || pathname?.startsWith("/new") || pathname?.startsWith("/analytics");

  useEffect(() => {
    // Initialize online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (!isOnline) {
        setWasOffline(true);
        setShowRestored(true);
        setDismissed(false);
        // Auto-dismiss the restored message after 5 seconds
        setTimeout(() => {
          setShowRestored(false);
          setWasOffline(false);
        }, 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOnline]);

  // Reset dismissed state when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setDismissed(false);
    }
  }, [isOnline, wasOffline]);

  if (!isProtectedRoute) return null;

  if (isOnline && !showRestored) return null;

  if (dismissed) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2 transition-all duration-300 ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-red-600 text-white"
      }`}
    >
      <div className="flex items-center gap-2 mx-auto">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">
              Connection restored. You can continue using the app.
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You&apos;re offline. Please check your internet connection.
            </span>
          </>
        )}
      </div>
      {isOnline && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white hover:bg-white/20"
          onClick={() => setShowRestored(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
