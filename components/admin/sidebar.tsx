"use client";

import {
	BarChart3,
	BookOpen,
	ChevronLeft,
	Globe,
	Headphones,
	LayoutDashboard,
	Menu,
	MessageSquare,
	PanelLeftClose,
	PanelLeftOpen,
	Settings,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
	{
		title: "Dashboard",
		href: "/admin",
		icon: LayoutDashboard,
	},
	{
		title: "Users",
		href: "/admin/users",
		icon: Users,
	},
	{
		title: "Conversations",
		href: "/admin/conversations",
		icon: MessageSquare,
	},
	{
		title: "Support Tickets",
		href: "/admin/support-tickets",
		icon: Headphones,
	},
	{
		title: "Analytics",
		href: "/admin/analytics",
		icon: BarChart3,
	},
	{
		title: "Knowledge Base",
		href: "/admin/knowledge-base",
		icon: BookOpen,
	},
	{
		title: "Landing Page",
		href: "/admin/landing-page",
		icon: Globe,
	},
	{
		title: "Settings",
		href: "/admin/settings",
		icon: Settings,
	},
];

function SidebarContent({
	onNavigate,
	collapsed,
}: { onNavigate?: () => void; collapsed?: boolean }) {
	const pathname = usePathname();

	return (
		<>
			{/* Header */}
			<div
				className={cn(
					"flex h-16 items-center gap-2 border-b border-neutral-200 px-4",
					collapsed && "justify-center px-2",
				)}
			>
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
					<Sparkles className="h-4 w-4 text-white" />
				</div>
				{!collapsed && (
					<div>
						<h1 className="text-sm font-semibold text-neutral-900">
							Admin Panel
						</h1>
						<p className="text-xs text-neutral-500">Alecci Media AI</p>
					</div>
				)}
			</div>

			{/* Navigation */}
			<nav className={cn("flex-1 space-y-1 p-4", collapsed && "p-2")}>
				{navItems.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/admin" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.href}
							href={item.href}
							onClick={onNavigate}
							title={collapsed ? item.title : undefined}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
								collapsed && "justify-center px-2",
								isActive
									? "bg-rose-50 text-rose-600"
									: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
							)}
						>
							<item.icon className="h-4 w-4 shrink-0" />
							{!collapsed && item.title}
						</Link>
					);
				})}
			</nav>

			{/* Footer */}
			<div
				className={cn(
					"border-t border-neutral-200 p-4",
					collapsed && "p-2",
				)}
			>
				<Link href="/" onClick={onNavigate}>
					<Button
						variant="ghost"
						title={collapsed ? "Back to App" : undefined}
						className={cn(
							"w-full justify-start gap-2 text-neutral-600 hover:text-neutral-900",
							collapsed && "justify-center px-2",
						)}
					>
						<ChevronLeft className="h-4 w-4 shrink-0" />
						{!collapsed && "Back to App"}
					</Button>
				</Link>
			</div>
		</>
	);
}

export function AdminSidebar() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const pathname = usePathname();

	// Close mobile sidebar on route change
	useEffect(() => {
		setMobileOpen(false);
	}, [pathname]);

	return (
		<>
			{/* Mobile header bar */}
			<div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-neutral-200 bg-white px-4 md:hidden">
				<button
					type="button"
					onClick={() => setMobileOpen(true)}
					className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
				>
					<Menu className="h-5 w-5" />
				</button>
				<div className="flex items-center gap-2">
					<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
						<Sparkles className="h-3.5 w-3.5 text-white" />
					</div>
					<span className="text-sm font-semibold text-neutral-900">
						Admin
					</span>
				</div>
			</div>

			{/* Mobile sidebar overlay */}
			{mobileOpen && (
				<>
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss */}
					<div
						className="fixed inset-0 z-50 bg-black/50 md:hidden"
						onClick={() => setMobileOpen(false)}
					/>
					<div className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl md:hidden">
						<div className="absolute right-2 top-3">
							<button
								type="button"
								onClick={() => setMobileOpen(false)}
								className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
						<SidebarContent onNavigate={() => setMobileOpen(false)} />
					</div>
				</>
			)}

			{/* Desktop sidebar */}
			<div
				className={cn(
					"hidden md:flex h-full flex-col border-r border-neutral-200 bg-white transition-all duration-200 relative",
					collapsed ? "w-16" : "w-64",
				)}
			>
				<SidebarContent collapsed={collapsed} />
				{/* Collapse toggle */}
				<button
					type="button"
					onClick={() => setCollapsed(!collapsed)}
					className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white shadow-sm text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
				>
					{collapsed ? (
						<PanelLeftOpen className="h-3.5 w-3.5" />
					) : (
						<PanelLeftClose className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
		</>
	);
}
