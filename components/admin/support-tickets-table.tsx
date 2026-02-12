"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	ExternalLink,
	MessageSquare,
	MoreHorizontal,
	Search,
	Timer,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AdminTicketWithUser } from "@/lib/db/support-queries";
import type { TicketPriority, TicketStatus } from "@/lib/supabase/types";

const statusConfig = {
	open: {
		label: "Open",
		icon: Clock,
		color: "text-amber-600 bg-amber-50",
	},
	in_progress: {
		label: "In Progress",
		icon: AlertCircle,
		color: "text-blue-600 bg-blue-50",
	},
	resolved: {
		label: "Resolved",
		icon: CheckCircle,
		color: "text-emerald-600 bg-emerald-50",
	},
	closed: {
		label: "Closed",
		icon: CheckCircle,
		color: "text-neutral-600 bg-neutral-100",
	},
};

const priorityConfig = {
	low: { label: "Low", color: "text-neutral-600" },
	normal: { label: "Normal", color: "text-blue-600" },
	high: { label: "High", color: "text-amber-600" },
	urgent: { label: "Urgent", color: "text-red-600" },
};

export function SupportTicketsTable({
	tickets,
	onUpdateStatus,
	onUpdatePriority,
	onUpdateTimeSpent,
}: {
	tickets: AdminTicketWithUser[];
	onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
	onUpdatePriority: (
		ticketId: string,
		priority: TicketPriority,
	) => Promise<void>;
	onUpdateTimeSpent: (
		ticketId: string,
		timeSpentMinutes: number,
	) => Promise<void>;
}) {
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [isPending, startTransition] = useTransition();
	const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
	const [timeValue, setTimeValue] = useState<string>("");

	const filteredTickets = tickets.filter((ticket) => {
		const matchesSearch =
			ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
			ticket.userEmail.toLowerCase().includes(search.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || ticket.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	const handleStatusChange = (ticketId: string, status: TicketStatus) => {
		startTransition(async () => {
			await onUpdateStatus(ticketId, status);
		});
	};

	const handlePriorityChange = (ticketId: string, priority: TicketPriority) => {
		startTransition(async () => {
			await onUpdatePriority(ticketId, priority);
		});
	};

	const handleTimeSpentSave = (ticketId: string) => {
		const minutes = Number.parseInt(timeValue, 10);
		if (!Number.isNaN(minutes) && minutes >= 0) {
			startTransition(async () => {
				await onUpdateTimeSpent(ticketId, minutes);
				setEditingTimeId(null);
				setTimeValue("");
			});
		}
	};

	const formatTimeSpent = (minutes: number) => {
		if (minutes === 0) return "—";
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours === 0) return `${mins}m`;
		if (mins === 0) return `${hours}h`;
		return `${hours}h ${mins}m`;
	};

	return (
		<div className="rounded-xl border border-neutral-200 bg-white">
			{/* Header with filters */}
			<div className="flex flex-col gap-4 border-b border-neutral-100 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
					<Input
						placeholder="Search tickets..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="open">Open</SelectItem>
						<SelectItem value="in_progress">In Progress</SelectItem>
						<SelectItem value="resolved">Resolved</SelectItem>
						<SelectItem value="closed">Closed</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-neutral-100 text-left text-sm text-neutral-500">
							<th className="px-4 py-3 font-medium">Subject</th>
							<th className="px-4 py-3 font-medium">User</th>
							<th className="px-4 py-3 font-medium">Status</th>
							<th className="px-4 py-3 font-medium">Priority</th>
							<th className="px-4 py-3 font-medium">Messages</th>
							<th className="px-4 py-3 font-medium">Time Spent</th>
							<th className="px-4 py-3 font-medium">Created</th>
							<th className="px-4 py-3 font-medium">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{filteredTickets.length === 0 ? (
							<tr>
								<td
									colSpan={8}
									className="px-4 py-12 text-center text-neutral-500"
								>
									<MessageSquare className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
									<p>No tickets found</p>
								</td>
							</tr>
						) : (
							filteredTickets.map((ticket) => {
								const StatusIcon =
									statusConfig[ticket.status as keyof typeof statusConfig].icon;
								return (
									<tr
										key={ticket.id}
										className={`hover:bg-neutral-50 ${isPending ? "opacity-60" : ""}`}
									>
										<td className="px-4 py-3">
											<Link
												href={`/admin/support-tickets/${ticket.id}`}
												className="font-medium text-neutral-900 hover:text-rose-600"
											>
												<span className="line-clamp-1">{ticket.subject}</span>
											</Link>
											{ticket.category && (
												<span className="mt-0.5 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
													{ticket.category}
												</span>
											)}
										</td>
										<td className="px-4 py-3">
											<div>
												<p className="text-sm text-neutral-900">
													{ticket.userDisplayName || "—"}
												</p>
												<p className="text-xs text-neutral-500">
													{ticket.userEmail}
												</p>
											</div>
										</td>
										<td className="px-4 py-3">
											<span
												className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig[ticket.status as keyof typeof statusConfig].color}`}
											>
												<StatusIcon className="h-3 w-3" />
												{
													statusConfig[
														ticket.status as keyof typeof statusConfig
													].label
												}
											</span>
										</td>
										<td className="px-4 py-3">
											<span
												className={`text-sm font-medium ${priorityConfig[ticket.priority as keyof typeof priorityConfig].color}`}
											>
												{
													priorityConfig[
														ticket.priority as keyof typeof priorityConfig
													].label
												}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-neutral-600">
											{ticket.messageCount}
										</td>
										<td className="px-4 py-3">
											{editingTimeId === ticket.id ? (
												<div className="flex items-center gap-1">
													<Input
														type="number"
														min="0"
														placeholder="mins"
														value={timeValue}
														onChange={(e) => setTimeValue(e.target.value)}
														className="h-7 w-16 text-xs"
														onKeyDown={(e) => {
															if (e.key === "Enter")
																handleTimeSpentSave(ticket.id);
															if (e.key === "Escape") {
																setEditingTimeId(null);
																setTimeValue("");
															}
														}}
														autoFocus
													/>
													<Button
														size="icon"
														variant="ghost"
														className="h-6 w-6"
														onClick={() => handleTimeSpentSave(ticket.id)}
													>
														<CheckCircle className="h-3 w-3 text-emerald-600" />
													</Button>
												</div>
											) : (
												<button
													type="button"
													onClick={() => {
														setEditingTimeId(ticket.id);
														setTimeValue(
															ticket.timeSpentMinutes?.toString() || "0",
														);
													}}
													className="flex items-center gap-1 text-sm text-neutral-600 hover:text-rose-600"
												>
													<Timer className="h-3 w-3" />
													{formatTimeSpent(ticket.timeSpentMinutes || 0)}
												</button>
											)}
										</td>
										<td className="px-4 py-3 text-sm text-neutral-500">
											{formatDistanceToNow(new Date(ticket.createdAt), {
												addSuffix: true,
											})}
										</td>
										<td className="px-4 py-3">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem asChild>
														<Link href={`/admin/support-tickets/${ticket.id}`}>
															<ExternalLink className="mr-2 h-4 w-4" />
															View Details
														</Link>
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() =>
															handleStatusChange(ticket.id, "in_progress")
														}
														disabled={ticket.status === "in_progress"}
													>
														Mark In Progress
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleStatusChange(ticket.id, "resolved")
														}
														disabled={ticket.status === "resolved"}
													>
														Mark Resolved
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() =>
															handleStatusChange(ticket.id, "closed")
														}
														disabled={ticket.status === "closed"}
													>
														Close Ticket
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() =>
															handlePriorityChange(ticket.id, "urgent")
														}
														className="text-red-600"
														disabled={ticket.priority === "urgent"}
													>
														Mark Urgent
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
