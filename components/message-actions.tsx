import equal from "fast-deep-equal";
import { Check, Loader2, Maximize2 } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { useCopyToClipboard } from "usehooks-ts";
import { useCsrf } from "@/hooks/use-csrf";
import { BOT_PERSONALITIES, type BotType } from "@/lib/bot-personalities";
import { stripMarkdownForClipboard } from "@/lib/clipboard-utils";
import type { Vote } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Action, Actions } from "./elements/actions";
import {
	CopyIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	PencilEditIcon,
	ThumbDownIcon,
	ThumbUpIcon,
} from "./icons";
import { MessageReactions } from "./message-reactions";
import { VoicePlayerButton } from "./voice-player-button";

export function PureMessageActions({
	chatId,
	chatTitle,
	message,
	vote,
	isLoading,
	setMode,
	botType = "collaborative",
	onExpand,
}: {
	chatId: string;
	chatTitle?: string;
	message: ChatMessage;
	vote: Vote | undefined;
	isLoading: boolean;
	setMode?: (mode: "view" | "edit") => void;
	botType?: BotType;
	onExpand?: () => void;
}) {
	const { mutate } = useSWRConfig();
	const { csrfFetch } = useCsrf();
	const [_, copyToClipboard] = useCopyToClipboard();
	const [isExportingPdf, setIsExportingPdf] = useState(false);
	const [isExportingExcel, setIsExportingExcel] = useState(false);
	const [isCopied, setIsCopied] = useState(false);

	if (isLoading) {
		return null;
	}

	const textFromParts = message.parts
		?.filter((part) => part.type === "text")
		.map((part) => part.text)
		.join("\n")
		.trim();

	const handleCopy = async () => {
		if (!textFromParts) {
			toast.error("There's no text to copy!");
			return;
		}

		const cleanText = stripMarkdownForClipboard(textFromParts);
		await copyToClipboard(cleanText);
		setIsCopied(true);
		toast.success("Copied to clipboard!");

		// Reset after animation
		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
	};

	const handleExportPdf = async () => {
		if (!textFromParts || isExportingPdf) return;

		setIsExportingPdf(true);
		try {
			// Dynamic import to reduce initial bundle size
			const { exportToPDF } = await import("@/lib/pdf-export");

			const personality = botType ? BOT_PERSONALITIES[botType] : null;
			const name = personality?.name?.split(" ")[0] || "Assistant";
			const safeTopic = (chatTitle || "Message")
				.replace(/[^a-zA-Z0-9\s-]/g, "")
				.replace(/\s+/g, "-")
				.slice(0, 40);
			const timestamp = new Date()
				.toISOString()
				.replace(/[:.]/g, "-")
				.slice(0, 19);
			const filename = `${safeTopic}-${name}-${timestamp}`;

			await exportToPDF(
				textFromParts,
				filename,
				personality?.name || "Assistant",
				personality?.role || "",
				chatTitle,
			);

			toast.success("PDF exported successfully");
		} catch (error) {
			console.error("PDF export failed:", error);
			toast.error("Failed to export PDF");
		} finally {
			setIsExportingPdf(false);
		}
	};

	const handleExportExcel = async () => {
		if (!textFromParts || isExportingExcel) return;

		setIsExportingExcel(true);
		try {
			// Dynamic import to reduce initial bundle size (~3.5MB savings)
			const { exportToExcel } = await import("@/lib/excel-export");

			const personality = botType ? BOT_PERSONALITIES[botType] : null;
			const name = personality?.name?.split(" ")[0] || "Assistant";
			const date = new Date().toISOString().split("T")[0];
			const filename = `${name}-message-${date}`;

			exportToExcel(textFromParts, {
				filename,
				sheetName: name,
			});

			toast.success("Excel exported successfully");
		} catch (error) {
			console.error("Excel export failed:", error);
			toast.error("Failed to export Excel");
		} finally {
			setIsExportingExcel(false);
		}
	};

	// User messages get edit (on hover) and copy actions
	if (message.role === "user") {
		return (
			<Actions className="-mr-0.5 justify-end">
				<div className="relative">
					{setMode && (
						<Action
							className="-left-10 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => setMode("edit")}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</Action>
					)}
					<Action
						className={cn(
							"transition-all duration-200",
							isCopied && "text-emerald-600 hover:text-emerald-600",
						)}
						onClick={handleCopy}
						tooltip={isCopied ? "Copied!" : "Copy"}
					>
						{isCopied ? (
							<Check className="size-4 animate-in zoom-in-50 duration-200" />
						) : (
							<CopyIcon />
						)}
					</Action>
				</div>
			</Actions>
		);
	}

	return (
		<Actions className="-ml-0.5">
			<Action
				className={cn(
					"transition-all duration-200",
					isCopied && "text-emerald-600 hover:text-emerald-600",
				)}
				onClick={handleCopy}
				tooltip={isCopied ? "Copied!" : "Copy text"}
			>
				{isCopied ? (
					<Check className="size-4 animate-in zoom-in-50 duration-200" />
				) : (
					<CopyIcon />
				)}
			</Action>

			{/* Voice Player with Volume & Speed Controls */}
			{textFromParts && (
				<VoicePlayerButton botType={botType} text={textFromParts} />
			)}

			{onExpand && (
				<Action onClick={onExpand} tooltip="Expand">
					<Maximize2 className="size-4" />
				</Action>
			)}

			{textFromParts && (
				<Action
					disabled={isExportingPdf}
					onClick={handleExportPdf}
					tooltip={isExportingPdf ? "Exporting..." : "Export as PDF"}
				>
					{isExportingPdf ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<FileTextIcon size={16} />
					)}
				</Action>
			)}

			{textFromParts && (
				<Action
					disabled={isExportingExcel}
					onClick={handleExportExcel}
					tooltip={isExportingExcel ? "Exporting..." : "Export as Excel"}
				>
					{isExportingExcel ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<FileSpreadsheetIcon size={16} />
					)}
				</Action>
			)}

			<Action
				data-testid="message-upvote"
				disabled={vote?.isUpvoted}
				onClick={() => {
					const upvote = csrfFetch("/api/vote", {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: "up",
						}),
					});

					toast.promise(upvote, {
						loading: "Upvoting Response...",
						success: () => {
							mutate<Vote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes) => {
									if (!currentVotes) {
										return [];
									}

									const votesWithoutCurrent = currentVotes.filter(
										(currentVote) => currentVote.messageId !== message.id,
									);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: true,
											deletedAt: null,
										},
									];
								},
								{ revalidate: false },
							);

							return "Upvoted Response!";
						},
						error: "Failed to upvote response.",
					});
				}}
				tooltip="Upvote Response"
			>
				<ThumbUpIcon />
			</Action>

			<Action
				data-testid="message-downvote"
				disabled={vote && !vote.isUpvoted}
				onClick={() => {
					const downvote = csrfFetch("/api/vote", {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: "down",
						}),
					});

					toast.promise(downvote, {
						loading: "Downvoting Response...",
						success: () => {
							mutate<Vote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes) => {
									if (!currentVotes) {
										return [];
									}

									const votesWithoutCurrent = currentVotes.filter(
										(currentVote) => currentVote.messageId !== message.id,
									);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: false,
											deletedAt: null,
										},
									];
								},
								{ revalidate: false },
							);

							return "Downvoted Response!";
						},
						error: "Failed to downvote response.",
					});
				}}
				tooltip="Downvote Response"
			>
				<ThumbDownIcon />
			</Action>

			{/* Message Reactions */}
			<div className="ml-2 border-l border-stone-200 pl-2">
				<MessageReactions messageId={message.id} />
			</div>
		</Actions>
	);
}

export const MessageActions = memo(
	PureMessageActions,
	(prevProps, nextProps) => {
		if (!equal(prevProps.vote, nextProps.vote)) {
			return false;
		}
		if (prevProps.isLoading !== nextProps.isLoading) {
			return false;
		}

		return true;
	},
);
