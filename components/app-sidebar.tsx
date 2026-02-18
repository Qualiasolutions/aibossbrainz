"use client";

import type { User } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Phone, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import {
	getChatHistoryPaginationKey,
	SidebarHistory,
} from "@/components/sidebar-history";
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
import { useCsrf } from "@/hooks/use-csrf";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";

export function AppSidebar({
	user,
	isAdmin = false,
}: {
	user: User | undefined;
	isAdmin?: boolean;
}) {
	const router = useRouter();
	const { setOpenMobile } = useSidebar();
	const { mutate } = useSWRConfig();
	const { csrfFetch } = useCsrf();
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
	const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useMobileSidebar();

	const handleDeleteAll = () => {
		const deletePromise = csrfFetch("/api/history", {
			method: "DELETE",
		});

		toast.promise(deletePromise, {
			loading: "Deleting all chats...",
			success: () => {
				mutate(unstable_serialize(getChatHistoryPaginationKey));
				router.push("/new");
				setShowDeleteAllDialog(false);
				setIsMobileSidebarOpen(false);
				return "All chats deleted successfully";
			},
			error: "Failed to delete all chats",
		});
	};

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
										src="/images/AM_Logo_Horizontal_4C+(1).webp"
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
							<div className="flex gap-2">
								{user && (
									<Button
										className="h-9 flex-1 rounded-lg border border-border bg-background text-muted-foreground shadow-none hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
										onClick={() => setShowDeleteAllDialog(true)}
										variant="ghost"
										size="sm"
									>
										<Trash2 className="mr-1.5 h-3.5 w-3.5" />
										<span className="text-xs font-medium">Clear</span>
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

							{/* Voice Call Button */}
							{user && (
								<Link href="/call">
									<Button
										className="h-9 w-full rounded-lg border border-emerald-200/50 bg-emerald-50/50 text-emerald-700 shadow-none hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
										variant="ghost"
										size="sm"
										onClick={() => {
											setOpenMobile(false);
											setIsMobileSidebarOpen(false);
										}}
									>
										<Phone className="mr-1.5 h-3.5 w-3.5" />
										<span className="text-xs font-medium">Voice Call</span>
									</Button>
								</Link>
							)}
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
						Powered by Alecci Media
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
										src="/images/AM_Logo_Horizontal_4C+(1).webp"
										alt="Alecci Media"
										width={140}
										height={45}
										className="h-auto w-full max-w-[140px]"
									/>
									<span className="text-[10px] tracking-wide text-muted-foreground/60">
										Powered by Alecci Media
									</span>
								</Link>

								<div className="flex gap-2">
									{user && (
										<Button
											className="h-9 flex-1 rounded-lg border border-border bg-background text-muted-foreground shadow-none hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
											onClick={() => setShowDeleteAllDialog(true)}
											variant="ghost"
											size="sm"
										>
											<Trash2 className="mr-1 h-3.5 w-3.5" />
											<span className="text-xs">Clear</span>
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

								{/* Mobile Voice Call Button */}
								{user && (
									<Link
										href="/call"
										onClick={() => setIsMobileSidebarOpen(false)}
									>
										<Button
											className="h-9 w-full rounded-lg border border-emerald-200/50 bg-emerald-50/50 text-emerald-700 shadow-none hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
											variant="ghost"
											size="sm"
										>
											<Phone className="mr-1.5 h-3.5 w-3.5" />
											<span className="text-xs font-medium">Voice Call</span>
										</Button>
									</Link>
								)}
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
								Powered by Alecci Media
							</p>
						</div>
					</SheetContent>
				</Sheet>
			</div>

			<AlertDialog
				onOpenChange={setShowDeleteAllDialog}
				open={showDeleteAllDialog}
			>
				<AlertDialogContent className="mx-4 max-w-md rounded-2xl border-border bg-background">
					<AlertDialogHeader>
						<AlertDialogTitle className="font-semibold text-lg text-foreground">
							Delete all chats?
						</AlertDialogTitle>
						<AlertDialogDescription className="text-muted-foreground">
							This action cannot be undone. This will permanently delete all
							your chats and remove them from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="rounded-lg bg-red-600 text-white hover:bg-red-700"
							onClick={handleDeleteAll}
						>
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
