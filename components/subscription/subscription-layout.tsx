"use client";

import type { ReactNode } from "react";
import { UpgradeBanner } from "./upgrade-banner";

interface SubscriptionLayoutProps {
  children: ReactNode;
}

export function SubscriptionLayout({ children }: SubscriptionLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      <UpgradeBanner />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
