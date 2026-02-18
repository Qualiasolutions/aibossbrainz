"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, Paperclip, Send, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { BotType } from "@/lib/bot-personalities";
import type { LandingPageCMSContent } from "@/lib/cms/landing-page-types";
import { cn } from "@/lib/utils";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	botType?: BotType;
}

interface InteractiveChatDemoProps {
	content: LandingPageCMSContent;
}

// Generate UUID for messages
function generateId(): string {
	return crypto.randomUUID();
}

// Helper to parse **bold** markdown
function formatBoldText(text: string) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g);
	return parts.map((part, i) => {
		if (part.startsWith("**") && part.endsWith("**")) {
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: text split fragments have no stable key
				<strong key={i} className="font-semibold text-stone-900">
					{part.slice(2, -2)}
				</strong>
			);
		}
		return part;
	});
}

export function InteractiveChatDemo({ content }: InteractiveChatDemoProps) {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedExec, setSelectedExec] = useState<BotType>("collaborative");
	const [rateLimitHit, setRateLimitHit] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const sendMessage = useCallback(async () => {
		if (!input.trim() || isLoading || rateLimitHit) return;

		const userMessage: Message = {
			id: generateId(),
			role: "user",
			content: input.trim(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setError(null);

		// Scroll after user message
		setTimeout(scrollToBottom, 100);

		try {
			// Convert messages to API format
			const apiMessages = [...messages, userMessage].map((m) => ({
				id: m.id,
				role: m.role,
				parts: [{ type: "text" as const, text: m.content }],
			}));

			const response = await fetch("/api/demo/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					messages: apiMessages,
					botType: selectedExec,
				}),
			});

			if (response.status === 429) {
				const data = await response.json();
				setRateLimitHit(true);
				setError(data.message);
				setIsLoading(false);
				return;
			}

			if (!response.ok) {
				throw new Error("Failed to send message");
			}

			// Stream the response
			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const assistantMessage: Message = {
				id: generateId(),
				role: "assistant",
				content: "",
				botType: selectedExec,
			};

			setMessages((prev) => [...prev, assistantMessage]);

			const decoder = new TextDecoder();
			let accumulatedContent = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));

							// Handle different response types from AI SDK
							if (data.type === "text-delta" && data.textDelta) {
								accumulatedContent += data.textDelta;
								setMessages((prev) =>
									prev.map((m) =>
										m.id === assistantMessage.id
											? { ...m, content: accumulatedContent }
											: m,
									),
								);
								scrollToBottom();
							}
							// Handle content update type
							if (data.type === "text" && data.content) {
								accumulatedContent = data.content;
								setMessages((prev) =>
									prev.map((m) =>
										m.id === assistantMessage.id
											? { ...m, content: accumulatedContent }
											: m,
									),
								);
								scrollToBottom();
							}
							// Handle assistant message with content
							if (data.role === "assistant" && data.content) {
								accumulatedContent = data.content;
								setMessages((prev) =>
									prev.map((m) =>
										m.id === assistantMessage.id
											? { ...m, content: accumulatedContent }
											: m,
									),
								);
								scrollToBottom();
							}
						} catch {
							// Ignore parse errors for non-JSON lines
						}
					}
				}
			}
		} catch (err) {
			console.error("Demo chat error:", err);
			setError("Something went wrong. Please try again.");
		} finally {
			setIsLoading(false);
			setTimeout(scrollToBottom, 100);
		}
	}, [input, isLoading, messages, selectedExec, scrollToBottom, rateLimitHit]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const getExecutiveInfo = (botType: BotType) => {
		if (botType === "alexandria") {
			return {
				name: content.executives.alex_name,
				title: content.executives.alex_role,
				image: content.executives.alex_image,
				gradient: "from-red-500 to-rose-600",
			};
		}
		if (botType === "kim") {
			return {
				name: content.executives.kim_name,
				title: content.executives.kim_role,
				image: content.executives.kim_image,
				gradient: "from-stone-700 to-stone-900",
			};
		}
		return {
			name: "Alexandria & Kim",
			title: "Executive Team",
			image: content.executives.alex_image,
			gradient: "from-red-500 to-stone-800",
		};
	};

	const suggestedQuestions = [
		"What's a good go-to-market strategy for a SaaS startup?",
		"How do I improve my sales conversion rate?",
		"Help me create a brand positioning statement",
	];

	return (
		<div className="relative w-full">
			{/* Browser Chrome - V0 Style */}
			<div className="relative overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm ring-1 ring-stone-900/5">
				{/* Window Controls */}
				<div className="flex items-center justify-between border-b border-stone-100 bg-gradient-to-r from-stone-50 to-stone-100/80 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="flex gap-2">
							<motion.div
								whileHover={{ scale: 1.1 }}
								className="size-3 rounded-full bg-red-400 shadow-sm"
							/>
							<motion.div
								whileHover={{ scale: 1.1 }}
								className="size-3 rounded-full bg-yellow-400 shadow-sm"
							/>
							<motion.div
								whileHover={{ scale: 1.1 }}
								className="size-3 rounded-full bg-green-400 shadow-sm"
							/>
						</div>
						<div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm border border-stone-200/50">
							<Image
								src={content.header.logo_url}
								alt="AI Boss Brainz"
								className="h-4 w-auto"
								width={80}
								height={16}
							/>
							<span className="text-[10px] font-medium text-stone-500">
								app.bossybrainz.ai
							</span>
						</div>
					</div>

					{/* Live indicator */}
					<motion.div
						animate={{ opacity: [0.5, 1, 0.5] }}
						transition={{ duration: 2, repeat: Infinity }}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200"
					>
						<div className="size-1.5 rounded-full bg-green-500" />
						<span className="text-[10px] font-semibold text-green-700 uppercase tracking-wide">
							Live
						</span>
					</motion.div>
				</div>

				{/* Chat Interface */}
				<div className="h-[420px] overflow-hidden bg-gradient-to-b from-stone-50/50 to-white sm:h-[440px]">
					{/* Header */}
					<div className="flex items-center justify-between border-b border-stone-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
						<div className="flex items-center gap-2.5">
							<div className="flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-gradient-to-br from-white to-stone-50 text-stone-500 shadow-sm">
								<svg
									className="size-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
									/>
								</svg>
							</div>
							<div>
								<span className="text-xs font-bold text-stone-900">
									Interactive Demo
								</span>
								<p className="text-[10px] text-stone-500">
									Try it free, no signup
								</p>
							</div>
						</div>

						{/* Executive Selector - Enhanced */}
						<div className="flex items-center gap-1.5 rounded-full bg-stone-100 p-1 shadow-inner">
							{[
								{
									id: "alexandria" as const,
									img: content.executives.alex_image,
									label: content.executives.alex_name.split(" ")[0],
								},
								{
									id: "kim" as const,
									img: content.executives.kim_image,
									label: content.executives.kim_name.split(" ")[0],
								},
								{ id: "collaborative" as const, icon: true, label: "Both" },
							].map((exec) => (
								<motion.button
									key={exec.id}
									type="button"
									onClick={() => setSelectedExec(exec.id)}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className={cn(
										"relative flex size-9 items-center justify-center rounded-full transition-all",
										selectedExec === exec.id
											? "bg-white shadow-md ring-2 ring-stone-200"
											: "hover:bg-stone-200/60",
									)}
									title={
										exec.id === "alexandria"
											? content.executives.alex_name
											: exec.id === "kim"
												? content.executives.kim_name
												: "Both Executives"
									}
								>
									{exec.icon ? (
										<div className="flex -space-x-1.5">
											<Image
												src={content.executives.alex_image}
												className="size-4 rounded-full border border-white shadow-sm"
												alt=""
												width={16}
												height={16}
											/>
											<Image
												src={content.executives.kim_image}
												className="size-4 rounded-full border border-white shadow-sm"
												alt=""
												width={16}
												height={16}
											/>
										</div>
									) : (
										<Image
											src={exec.img as string}
											className="size-5 rounded-full"
											alt=""
											width={20}
											height={20}
										/>
									)}
									{selectedExec === exec.id && (
										<motion.div
											layoutId="activeExec"
											className="absolute inset-0 rounded-full ring-2 ring-red-400"
											transition={{
												type: "spring",
												stiffness: 300,
												damping: 30,
											}}
										/>
									)}
								</motion.button>
							))}
						</div>

						<Link
							href="/login"
							className="group flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 text-xs font-semibold text-white shadow-md transition-all hover:from-red-600 hover:to-red-700 hover:shadow-lg"
						>
							<span>Start 14-Day Free Trial</span>
							<Sparkles className="size-3 transition-transform group-hover:rotate-12" />
						</Link>
					</div>

					{/* Messages Area */}
					<div className="h-[calc(100%-140px)] space-y-4 overflow-y-auto p-4">
						{/* Empty state with suggestions - Enhanced */}
						{messages.length === 0 && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex h-full flex-col items-center justify-center text-center"
							>
								<motion.div
									animate={{ y: [0, -5, 0] }}
									transition={{
										duration: 3,
										repeat: Infinity,
										ease: "easeInOut",
									}}
									className="mb-5 relative"
								>
									<div className="absolute inset-0 bg-gradient-to-r from-red-400 to-rose-400 rounded-full blur-xl opacity-30" />
									<div className="relative flex -space-x-4">
										<Image
											src={content.executives.alex_image}
											className="size-16 rounded-full border-3 border-white shadow-xl"
											alt=""
											width={64}
											height={64}
										/>
										<Image
											src={content.executives.kim_image}
											className="size-16 rounded-full border-3 border-white shadow-xl"
											alt=""
											width={64}
											height={64}
										/>
									</div>
								</motion.div>
								<h3 className="mb-2 text-lg font-bold text-stone-900">
									Experience AI Executive Consulting
								</h3>
								<p className="mb-5 max-w-xs text-sm text-stone-500 leading-relaxed">
									Ask our AI executives anything about marketing strategy, sales
									optimization, or business growth.
								</p>
								<div className="flex flex-wrap justify-center gap-2">
									{suggestedQuestions.map((q, i) => (
										<motion.button
											key={q}
											type="button"
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: i * 0.1, duration: 0.3 }}
											onClick={() => setInput(q)}
											className="rounded-full bg-stone-100 px-4 py-2 text-xs font-medium text-stone-600 transition-all hover:bg-stone-200 hover:text-stone-900 hover:shadow-sm"
										>
											{q.length > 40 ? `${q.slice(0, 40)}...` : q}
										</motion.button>
									))}
								</div>
							</motion.div>
						)}

						{/* Messages - Enhanced */}
						<AnimatePresence mode="popLayout">
							{messages.map((message) => (
								<motion.div
									key={message.id}
									initial={{ opacity: 0, y: 15, scale: 0.95 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -10, scale: 0.95 }}
									transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
									className={cn(
										"flex w-full",
										message.role === "user" ? "justify-end" : "justify-start",
									)}
								>
									{message.role === "assistant" ? (
										<div className="max-w-[90%] sm:max-w-[85%]">
											<div className="relative flex flex-col gap-2 rounded-2xl border border-stone-200/50 bg-gradient-to-br from-white to-stone-50/80 px-4 py-3 shadow-sm">
												{/* Gradient accent bar */}
												<div
													className={cn(
														"absolute bottom-3 left-0 top-3 w-1 rounded-full bg-gradient-to-b",
														getExecutiveInfo(message.botType || "collaborative")
															.gradient,
													)}
												/>

												<div className="flex items-center gap-2.5 pl-3">
													<div className="relative">
														<div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-rose-500 opacity-20 blur-sm" />
														<Image
															src={
																getExecutiveInfo(
																	message.botType || "collaborative",
																).image
															}
															alt=""
															className="relative size-9 rounded-full border-2 border-white shadow-sm"
															width={36}
															height={36}
														/>
														<span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
													</div>
													<div>
														<div className="text-sm font-bold text-stone-900">
															{
																getExecutiveInfo(
																	message.botType || "collaborative",
																).name
															}
														</div>
														<div className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">
															{
																getExecutiveInfo(
																	message.botType || "collaborative",
																).title
															}
														</div>
													</div>
												</div>

												<div className="pl-3 text-xs leading-relaxed text-stone-700">
													{message.content ? (
														message.content.split("\n").map((line, i) => (
															// biome-ignore lint/suspicious/noArrayIndexKey: text line split has no stable key
															<span key={i}>
																{formatBoldText(line)}
																{i < message.content.split("\n").length - 1 && (
																	<br />
																)}
															</span>
														))
													) : (
														<span className="flex items-center gap-2 text-stone-500">
															<Loader2 className="size-3 animate-spin" />
															Thinking...
														</span>
													)}
												</div>
											</div>
										</div>
									) : (
										<div className="max-w-[85%] rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-900 to-stone-800 px-4 py-2.5 text-sm text-white shadow-md sm:max-w-[70%]">
											{message.content}
										</div>
									)}
								</motion.div>
							))}
						</AnimatePresence>

						{/* Loading indicator - Enhanced */}
						{isLoading && messages[messages.length - 1]?.role === "user" && (
							<motion.div
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex justify-start"
							>
								<div className="max-w-[85%]">
									<div className="relative flex flex-col gap-2 rounded-2xl border border-stone-200/50 bg-gradient-to-br from-white to-stone-50/80 px-4 py-3 shadow-sm">
										<div
											className={cn(
												"absolute bottom-3 left-0 top-3 w-1 rounded-full bg-gradient-to-b",
												getExecutiveInfo(selectedExec).gradient,
											)}
										/>
										<div className="flex items-center gap-2.5 pl-3">
											<div className="relative">
												<div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-rose-500 opacity-20 blur-sm animate-pulse" />
												<Image
													src={getExecutiveInfo(selectedExec).image}
													alt=""
													className="relative size-9 rounded-full border-2 border-white shadow-sm"
													width={36}
													height={36}
												/>
											</div>
											<div className="flex items-center gap-2">
												<div className="flex gap-1">
													{[0, 1, 2].map((i) => (
														<motion.span
															key={i}
															animate={{ y: [0, -6, 0], scale: [1, 1.2, 1] }}
															transition={{
																duration: 0.6,
																repeat: Infinity,
																delay: i * 0.15,
															}}
															className={cn(
																"size-2 rounded-full shadow-sm",
																selectedExec === "alexandria"
																	? "bg-gradient-to-br from-red-500 to-rose-600"
																	: selectedExec === "kim"
																		? "bg-gradient-to-br from-stone-700 to-stone-900"
																		: "bg-gradient-to-br from-red-500 to-stone-800",
															)}
														/>
													))}
												</div>
												<span className="animate-pulse text-xs font-medium text-stone-500">
													Crafting response...
												</span>
											</div>
										</div>
									</div>
								</div>
							</motion.div>
						)}

						{/* Error message */}
						{error && (
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="flex justify-center"
							>
								<div className="rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 border border-amber-200 shadow-sm">
									{error}
									{rateLimitHit && (
										<Link
											href="/login"
											className="ml-2 font-bold text-red-600 underline decoration-red-300 underline-offset-2 hover:text-red-700"
										>
											Sign up free
										</Link>
									)}
								</div>
							</motion.div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Input Area - Enhanced */}
					<div className="border-t border-stone-100 bg-gradient-to-b from-white/90 to-stone-50/90 px-4 pb-4 pt-3 backdrop-blur-xl">
						<div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition-all focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 focus-within:shadow-md">
							<button
								type="button"
								className="text-stone-300 cursor-not-allowed hover:text-stone-400 transition-colors"
								disabled
								title="Attachments available in full version"
							>
								<Paperclip className="size-4" />
							</button>
							<button
								type="button"
								className="text-stone-300 cursor-not-allowed hover:text-stone-400 transition-colors"
								disabled
								title="Voice available in full version"
							>
								<Mic className="size-4" />
							</button>
							<input
								ref={inputRef}
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={handleKeyDown}
								placeholder={
									rateLimitHit
										? "Sign up to continue..."
										: "Ask anything about business strategy..."
								}
								disabled={rateLimitHit}
								className="flex-1 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none disabled:cursor-not-allowed"
							/>
							<button
								type="button"
								onClick={sendMessage}
								disabled={!input.trim() || isLoading || rateLimitHit}
								className={cn(
									"flex size-9 items-center justify-center rounded-lg transition-all",
									input.trim() && !isLoading && !rateLimitHit
										? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg"
										: "bg-stone-100 text-stone-400",
								)}
							>
								{isLoading ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<Send className="size-4" />
								)}
							</button>
						</div>
						<p className="mt-2.5 text-center text-[10px] font-medium text-stone-400">
							{rateLimitHit ? (
								<span className="text-amber-600">Demo limit reached</span>
							) : (
								<span>{`${5 - messages.filter((m) => m.role === "user").length} free messages remaining`}</span>
							)}
							{" • "}
							<Link
								href="/login"
								className="text-red-500 hover:text-red-600 underline decoration-red-300 underline-offset-2 font-semibold"
							>
								Sign up for unlimited
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
