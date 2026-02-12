"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	Building2,
	CheckCircle,
	ChevronLeft,
	Clock,
	Eye,
	EyeOff,
	Mail,
	Send,
	User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
	SupportTicket,
	SupportTicketMessage,
	TicketPriority,
	TicketStatus,
	User,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const statusConfig = {
	open: {
		label: "Open",
		icon: Clock,
		color: "text-amber-600 bg-amber-50 border-amber-200",
	},
	in_progress: {
		label: "In Progress",
		icon: AlertCircle,
		color: "text-blue-600 bg-blue-50 border-blue-200",
	},
	resolved: {
		label: "Resolved",
		icon: CheckCircle,
		color: "text-emerald-600 bg-emerald-50 border-emerald-200",
	},
	closed: {
		label: "Closed",
		icon: CheckCircle,
		color: "text-neutral-600 bg-neutral-100 border-neutral-200",
	},
};

export function SupportTicketDetail({
	ticket,
	user,
	messages,
	onUpdateStatus,
	onUpdatePriority,
	onSendReply,
}: {
	ticket: SupportTicket;
	user: Pick<User, "id" | "email" | "displayName" | "companyName"> | null;
	messages: SupportTicketMessage[];
	onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
	onUpdatePriority: (
		ticketId: string,
		priority: TicketPriority,
	) => Promise<void>;
	onSendReply: (
		ticketId: string,
		adminId: string,
		content: string,
		isInternal: boolean,
	) => Promise<SupportTicketMessage>;
}) {
	const [replyContent, setReplyContent] = useState("");
	const [isInternal, setIsInternal] = useState(false);
	const [isPending, startTransition] = useTransition();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const StatusIcon =
		statusConfig[ticket.status as keyof typeof statusConfig].icon;

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	const handleSendReply = () => {
		if (!replyContent.trim() || isPending) return;

		startTransition(async () => {
			// We need the admin ID - in a real app this would come from the session
			// For now, using a placeholder that will be set by the server action
			await onSendReply(
				ticket.id,
				user?.id || "",
				replyContent.trim(),
				isInternal,
			);
			setReplyContent("");
			setIsInternal(false);
		});
	};

	const handleStatusChange = (status: TicketStatus) => {
		startTransition(async () => {
			await onUpdateStatus(ticket.id, status);
		});
	};

	const handlePriorityChange = (priority: TicketPriority) => {
		startTransition(async () => {
			await onUpdatePriority(ticket.id, priority);
		});
	};

	return (
		<div className="mx-auto max-w-5xl">
			{/* Back button */}
			<Link
				href="/admin/support-tickets"
				className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
			>
				<ChevronLeft className="h-4 w-4" />
				Back to Tickets
			</Link>

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Main content - Messages */}
				<div className="lg:col-span-2">
					<div className="rounded-xl border border-neutral-200 bg-white">
						{/* Ticket Header */}
						<div className="border-b border-neutral-100 p-4">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h1 className="text-xl font-bold text-neutral-900">
										{ticket.subject}
									</h1>
									<p className="mt-1 text-sm text-neutral-500">
										Created{" "}
										{format(
											new Date(ticket.createdAt),
											"MMM d, yyyy 'at' h:mm a",
										)}
									</p>
								</div>
								<div
									className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium ${statusConfig[ticket.status as keyof typeof statusConfig].color}`}
								>
									<StatusIcon className="h-4 w-4" />
									{
										statusConfig[ticket.status as keyof typeof statusConfig]
											.label
									}
								</div>
							</div>
						</div>

						{/* Messages */}
						<div className="max-h-[500px] space-y-4 overflow-y-auto p-4">
							{messages.map((msg) => (
								<div
									key={msg.id}
									className={cn(
										"rounded-lg p-4",
										msg.isAdminReply
											? msg.isInternal
												? "ml-4 border border-dashed border-amber-200 bg-amber-50"
												: "ml-4 border border-rose-200 bg-rose-50"
											: "mr-4 border border-neutral-200 bg-white",
									)}
								>
									<div className="mb-2 flex items-center justify-between">
										<span
											className={`text-sm font-medium ${
												msg.isAdminReply
													? msg.isInternal
														? "text-amber-700"
														: "text-rose-700"
													: "text-neutral-700"
											}`}
										>
											{msg.isAdminReply ? (
												msg.isInternal ? (
													<span className="flex items-center gap-1">
														<EyeOff className="h-3 w-3" />
														Internal Note
													</span>
												) : (
													"Support Team"
												)
											) : (
												user?.displayName || user?.email || "User"
											)}
										</span>
										<span className="text-xs text-neutral-400">
											{formatDistanceToNow(new Date(msg.createdAt), {
												addSuffix: true,
											})}
										</span>
									</div>
									<p className="whitespace-pre-wrap text-sm text-neutral-700">
										{msg.content}
									</p>
								</div>
							))}
							<div ref={messagesEndRef} />
						</div>

						{/* Reply Form */}
						{ticket.status !== "closed" && (
							<div className="border-t border-neutral-100 p-4">
								<div className="mb-3 flex items-center justify-between">
									<Label className="text-sm font-medium">Reply</Label>
									<div className="flex items-center gap-2">
										<Switch
											id="internal"
											checked={isInternal}
											onCheckedChange={setIsInternal}
										/>
										<Label
											htmlFor="internal"
											className="flex cursor-pointer items-center gap-1 text-sm text-neutral-600"
										>
											{isInternal ? (
												<EyeOff className="h-3 w-3" />
											) : (
												<Eye className="h-3 w-3" />
											)}
											{isInternal ? "Internal note" : "Visible to user"}
										</Label>
									</div>
								</div>
								<div className="flex gap-2">
									<Textarea
										value={replyContent}
										onChange={(e) => setReplyContent(e.target.value)}
										placeholder={
											isInternal
												? "Add an internal note (not visible to user)..."
												: "Type your reply..."
										}
										className={cn(
											"min-h-[100px] resize-none",
											isInternal && "border-amber-200 bg-amber-50/50",
										)}
									/>
								</div>
								<div className="mt-3 flex justify-end">
									<Button
										onClick={handleSendReply}
										disabled={!replyContent.trim() || isPending}
										className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700"
									>
										{isPending ? (
											<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
										) : (
											<Send className="mr-2 h-4 w-4" />
										)}
										{isInternal ? "Add Note" : "Send Reply"}
									</Button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Sidebar - Ticket Info */}
				<div className="space-y-4">
					{/* User Info */}
					<div className="rounded-xl border border-neutral-200 bg-white p-4">
						<h3 className="mb-3 font-semibold text-neutral-900">Customer</h3>
						<div className="space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<UserIcon className="h-4 w-4 text-neutral-400" />
								<span className="text-neutral-700">
									{user?.displayName || "—"}
								</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Mail className="h-4 w-4 text-neutral-400" />
								<span className="text-neutral-700">{user?.email || "—"}</span>
							</div>
							{user?.companyName && (
								<div className="flex items-center gap-2 text-sm">
									<Building2 className="h-4 w-4 text-neutral-400" />
									<span className="text-neutral-700">{user.companyName}</span>
								</div>
							)}
						</div>
					</div>

					{/* Ticket Management */}
					<div className="rounded-xl border border-neutral-200 bg-white p-4">
						<h3 className="mb-3 font-semibold text-neutral-900">
							Ticket Management
						</h3>
						<div className="space-y-4">
							<div>
								<Label className="mb-1.5 block text-sm text-neutral-600">
									Status
								</Label>
								<Select
									value={ticket.status}
									onValueChange={(val) =>
										handleStatusChange(val as TicketStatus)
									}
									disabled={isPending}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="open">Open</SelectItem>
										<SelectItem value="in_progress">In Progress</SelectItem>
										<SelectItem value="resolved">Resolved</SelectItem>
										<SelectItem value="closed">Closed</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label className="mb-1.5 block text-sm text-neutral-600">
									Priority
								</Label>
								<Select
									value={ticket.priority}
									onValueChange={(val) =>
										handlePriorityChange(val as TicketPriority)
									}
									disabled={isPending}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="normal">Normal</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{ticket.category && (
								<div>
									<Label className="mb-1.5 block text-sm text-neutral-600">
										Category
									</Label>
									<div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm capitalize text-neutral-700">
										{ticket.category}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Timestamps */}
					<div className="rounded-xl border border-neutral-200 bg-white p-4">
						<h3 className="mb-3 font-semibold text-neutral-900">Timeline</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-neutral-500">Created</span>
								<span className="text-neutral-700">
									{format(new Date(ticket.createdAt), "MMM d, yyyy")}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-neutral-500">Last Updated</span>
								<span className="text-neutral-700">
									{formatDistanceToNow(new Date(ticket.updatedAt), {
										addSuffix: true,
									})}
								</span>
							</div>
							{ticket.resolvedAt && (
								<div className="flex justify-between">
									<span className="text-neutral-500">Resolved</span>
									<span className="text-neutral-700">
										{format(new Date(ticket.resolvedAt), "MMM d, yyyy")}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
