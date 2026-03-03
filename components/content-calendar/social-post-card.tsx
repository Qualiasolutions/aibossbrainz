"use client";

import {
	Check,
	Copy,
	Facebook,
	ImageIcon,
	Instagram,
	Linkedin,
	Trash2,
	Twitter,
	Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import type { ContentCalendar, SocialPlatform } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface SocialPostCardProps {
	post: ContentCalendar;
	onUpdate?: () => void;
	compact?: boolean;
}

const platformConfig: Record<
	SocialPlatform,
	{ icon: React.ReactNode; color: string; label: string }
> = {
	linkedin: {
		icon: <Linkedin className="size-3.5" />,
		color: "bg-[#0A66C2]",
		label: "LinkedIn",
	},
	instagram: {
		icon: <Instagram className="size-3.5" />,
		color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
		label: "Instagram",
	},
	facebook: {
		icon: <Facebook className="size-3.5" />,
		color: "bg-[#1877F2]",
		label: "Facebook",
	},
	twitter: {
		icon: <Twitter className="size-3.5" />,
		color: "bg-black dark:bg-white dark:text-black",
		label: "X / Twitter",
	},
	tiktok: {
		icon: <Video className="size-3.5" />,
		color: "bg-black dark:bg-white dark:text-black",
		label: "TikTok",
	},
	generic: {
		icon: <ImageIcon className="size-3.5" />,
		color: "bg-muted-foreground",
		label: "General",
	},
};

const statusStyles: Record<string, string> = {
	draft: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
	scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
	posted:
		"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function SocialPostCard({
	post,
	onUpdate,
	compact = false,
}: SocialPostCardProps) {
	const [copiedField, setCopiedField] = useState<string | null>(null);
	const platform = platformConfig[post.platform] || platformConfig.generic;

	const copyToClipboard = async (text: string, field: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedField(field);
			setTimeout(() => setCopiedField(null), 2000);
			toast({
				type: "success",
				description: `${field === "caption" ? "Caption" : "Hashtags"} copied`,
			});
		} catch {
			toast({ type: "error", description: "Failed to copy" });
		}
	};

	const handleDelete = async () => {
		try {
			const response = await fetch(`/api/content-calendar/${post.id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete");
			toast({ type: "success", description: "Post removed" });
			onUpdate?.();
		} catch {
			toast({ type: "error", description: "Failed to delete post" });
		}
	};

	const hashtagString = post.hashtags.map((tag) => `#${tag}`).join(" ");

	return (
		<div className="group rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm">
			{/* Header: Platform + Status + Delete */}
			<div className="mb-2.5 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div
						className={cn(
							"flex size-7 items-center justify-center rounded-lg text-white",
							platform.color,
						)}
					>
						{platform.icon}
					</div>
					<div className="flex flex-col">
						<span className="text-xs font-semibold leading-tight">
							{platform.label}
						</span>
						{post.scheduledTime && (
							<span className="text-[10px] text-muted-foreground">
								{post.scheduledTime}
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<span
						className={cn(
							"rounded-full px-2 py-0.5 text-[10px] font-medium",
							statusStyles[post.status] || statusStyles.draft,
						)}
					>
						{post.status}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleDelete}
						className="size-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
					>
						<Trash2 className="size-3" />
					</Button>
				</div>
			</div>

			{/* Caption */}
			<div className="mb-2">
				<div className="mb-1 flex items-center justify-between">
					<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Caption
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => copyToClipboard(post.caption, "caption")}
						className="size-5"
					>
						{copiedField === "caption" ? (
							<Check className="size-3 text-emerald-600" />
						) : (
							<Copy className="size-3" />
						)}
					</Button>
				</div>
				<p
					className={cn(
						"whitespace-pre-wrap text-sm leading-relaxed",
						compact && "line-clamp-4",
					)}
				>
					{post.caption}
				</p>
			</div>

			{/* Hashtags */}
			{post.hashtags.length > 0 && (
				<div className="mb-2">
					<div className="mb-1 flex items-center justify-between">
						<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							Hashtags
						</span>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => copyToClipboard(hashtagString, "hashtags")}
							className="size-5"
						>
							{copiedField === "hashtags" ? (
								<Check className="size-3 text-emerald-600" />
							) : (
								<Copy className="size-3" />
							)}
						</Button>
					</div>
					<p className="text-xs leading-relaxed text-primary/70">
						{hashtagString}
					</p>
				</div>
			)}

			{/* Visual Suggestion */}
			{post.visualSuggestion && (
				<div className="rounded-lg border border-dashed border-border bg-muted/30 p-2.5">
					<div className="mb-1 flex items-center gap-1.5">
						<ImageIcon className="size-3 text-muted-foreground" />
						<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
							Visual
						</span>
					</div>
					<p className="text-xs leading-relaxed text-muted-foreground">
						{post.visualSuggestion}
					</p>
				</div>
			)}
		</div>
	);
}
