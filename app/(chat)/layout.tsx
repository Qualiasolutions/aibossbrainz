import dynamic from "next/dynamic";
import { Suspense } from "react";

const AppSidebar = dynamic(() =>
	import("@/components/app-sidebar").then((mod) => ({
		default: mod.AppSidebar,
	})),
);

const NetworkStatusBanner = dynamic(() =>
	import("@/components/network-status-banner").then((mod) => ({
		default: mod.NetworkStatusBanner,
	})),
);
const TosPopup = dynamic(() =>
	import("@/components/tos-popup").then((mod) => ({
		default: mod.TosPopup,
	})),
);

import { DataStreamProvider } from "@/components/data-stream-provider";
import { MobileSidebarProvider } from "@/components/mobile-sidebar-context";
import { SentryUser } from "@/components/sentry-user";
import {
	SubscriptionLayout,
	SubscriptionProvider,
} from "@/components/subscription";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<>
			{user && <SentryUser userId={user.id} email={user.email} />}
			{/* Network status banner for offline detection */}
			<NetworkStatusBanner />
			{/* Pyodide removed from layout - load on-demand in code-editor when Python execution is needed */}
			<TosPopup />
			<SubscriptionProvider>
				<DataStreamProvider>
					<MobileSidebarProvider>
						<SidebarProvider
							defaultOpen={true}
							className="!min-h-0 h-dvh overflow-hidden"
						>
							<AppSidebar user={user || undefined} />
							<SidebarInset className="min-h-0">
								<SubscriptionLayout>
									<Suspense
										fallback={
											<div className="flex h-dvh w-full items-center justify-center">
												<div className="size-8 animate-spin rounded-full border-4 border-stone-200 border-t-rose-500" />
											</div>
										}
									>
										{children}
									</Suspense>
								</SubscriptionLayout>
							</SidebarInset>
						</SidebarProvider>
					</MobileSidebarProvider>
				</DataStreamProvider>
			</SubscriptionProvider>
		</>
	);
}
