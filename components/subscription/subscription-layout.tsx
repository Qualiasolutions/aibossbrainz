"use client";

import type { ReactNode } from "react";
import { UpgradeBanner } from "./upgrade-banner";

interface SubscriptionLayoutProps {
	children: ReactNode;
}

export function SubscriptionLayout({ children }: SubscriptionLayoutProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<UpgradeBanner />
			<div className="min-h-0 flex-1 overflow-auto">{children}</div>
		</div>
	);
}
