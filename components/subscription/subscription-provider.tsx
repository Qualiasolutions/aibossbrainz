"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { PaywallModal } from "./paywall-modal";

interface SubscriptionStatus {
  isActive: boolean;
  subscriptionType: string | null;
  daysRemaining: number | null;
  isAdmin: boolean;
}

interface SubscriptionContextValue {
  status: SubscriptionStatus | null;
  isLoading: boolean;
  showPaywall: (title?: string, message?: string) => void;
  hidePaywall: () => void;
  refreshStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(
  null,
);

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallTitle, setPaywallTitle] = useState<string>();
  const [paywallMessage, setPaywallMessage] = useState<string>();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const showPaywall = useCallback((title?: string, message?: string) => {
    setPaywallTitle(title);
    setPaywallMessage(message);
    setPaywallOpen(true);
  }, []);

  const hidePaywall = useCallback(() => {
    setPaywallOpen(false);
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isLoading,
        showPaywall,
        hidePaywall,
        refreshStatus,
      }}
    >
      {children}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={hidePaywall}
        title={paywallTitle}
        message={paywallMessage}
      />
    </SubscriptionContext.Provider>
  );
}
