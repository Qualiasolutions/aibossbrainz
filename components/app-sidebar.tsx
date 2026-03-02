"use client";

import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Phone, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CallModal } from "@/components/call/call-modal";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import { SidebarHistory } from "@/components/sidebar-history";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar({
	user,
	isAdmin = false,
}: {
	user: User | undefined;
	isAdmin?: boolean;
}) {
	const router = useRouter();
	const { setOpenMobile } = useSidebar();
	const [showCallModal, setShowCallModal] = useState(false);
	const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSidebar();

	const handleNewChat = () => {
		setOpenMobile(false);
		setIsMobileSidebarOpen(false);
		router.push("/new");
		router.refresh();
	};

	return (
		<>
			<Sidebar className="w-72 border-r border-border bg-background">
				<SidebarHeader className="border-b border-border bg-background px-4 py-3">
					<SidebarMenu>
						<div className="flex flex-col gap-3">
							{/* Logo */}
							<Link
								className="flex flex-col items-center justify-center gap-0.5"
								href="/new"
								onClick={handleNewChat}
							>
								<motion.div
									className="flex items-center justify-center"
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
								>
									<Image
										src="/images/alecci-media-logo.webp"
										alt="Alecci Media"
										width={160}
										height={50}
										className="h-auto w-full max-w-[160px]"
									/>
								</motion.div>
								<span className="text-[10px] tracking-wide text-muted-foreground/60">
									Powered by Alecci Media
								</span>
							</Link>

							{/* Action buttons - consistent height */}
							<div className="flex gap-1.5">
								{user && (
									<Button
										className="h-9 flex-1 rounded-lg border border-border bg-background text-muted-foreground shadow-none hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600"
										onClick={() => setShowCallModal(true)}
										variant="ghost"
										size="sm"
									>
										<Phone className="mr-1.5 h-3.5 w-3.5" />
										<span className="text-xs font-medium">Call</span>
									</Button>
								)}
								<Button
									className="h-9 flex-1 rounded-lg"
									onClick={handleNewChat}
									size="sm"
								>
									<Plus className="mr-1.5 h-3.5 w-3.5" />
									<span className="text-xs font-medium">New Chat</span>
								</Button>
							</div>
						</div>
					</SidebarMenu>
				</SidebarHeader>

				{/* Expanded chat history area */}
				<SidebarContent className="flex-1 overflow-hidden bg-background px-3 py-4">
					<div className="h-full overflow-y-auto">
						<SidebarHistory user={user} />
					</div>
				</SidebarContent>

				{/* Footer with user nav only */}
				<SidebarFooter className="border-t border-border bg-background px-3 py-2">
					{user && (
						<div className="w-full">
							<SidebarUserNav user={user} isAdmin={isAdmin} />
						</div>
					)}
					<p className="text-center text-[10px] tracking-wide text-muted-foreground/50">
						Powered by{" "}
						<a
							href="https://aleccimedia.com"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-primary hover:underline"
						>
							Alecci Media
						</a>
					</p>
				</SidebarFooter>
			</Sidebar>

			{/* Mobile Sidebar */}
			<div className="lg:hidden">
				<Sheet onOpenChange={setIsMobileSidebarOpen} open={isMobileSidebarOpen}>
					<SheetContent
						className="w-72 border-r border-border bg-background p-0"
						side="left"
					>
						<SheetHeader className="border-b border-border bg-background px-4 py-3">
							<SheetTitle className="sr-only">Navigation Menu</SheetTitle>
							<div className="flex flex-col gap-3">
								<Link
									className="flex flex-col items-center justify-center gap-0.5"
									href="/new"
									onClick={handleNewChat}
								>
									<Image
										src="/images/alecci-media-logo.webp"
										alt="Alecci Media"
										width={140}
										height={45}
										className="h-auto w-full max-w-[140px]"
									/>
									<span className="text-[10px] tracking-wide text-muted-foreground/60">
										Powered by Alecci Media
									</span>
								</Link>

								<div className="flex gap-1.5">
									{user && (
										<Button
											className="h-9 flex-1 rounded-lg border border-border bg-background text-muted-foreground shadow-none hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600"
											onClick={() => setShowCallModal(true)}
											variant="ghost"
											size="sm"
										>
											<Phone className="mr-1 h-3.5 w-3.5" />
											<span className="text-xs">Call</span>
										</Button>
									)}
									<Button
										className="h-9 flex-1 rounded-lg"
										onClick={handleNewChat}
										size="sm"
									>
										<Plus className="mr-1 h-3.5 w-3.5" />
										<span className="text-xs">New</span>
									</Button>
								</div>
							</div>
						</SheetHeader>

						<div className="flex-1 overflow-hidden px-3 py-4">
							<div className="h-full overflow-y-auto">
								<SidebarHistory user={user} />
							</div>
						</div>

						<div className="border-t border-border bg-background px-3 py-2">
							{user && (
								<div className="w-full">
									<SidebarUserNav user={user} isAdmin={isAdmin} />
								</div>
							)}
							<p className="text-center text-[10px] tracking-wide text-muted-foreground/50">
								Powered by{" "}
								<a
									href="https://aleccimedia.com"
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-primary hover:underline"
								>
									Alecci Media
								</a>
							</p>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			<CallModal
				isOpen={showCallModal}
				onClose={() => setShowCallModal(false)}
			/>
		</>
	);
}
