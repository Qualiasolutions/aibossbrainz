"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
	initialArtifactData,
	useArtifact,
	useArtifactSelector,
} from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useAutoSpeak } from "@/hooks/use-auto-speak";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVoiceCall } from "@/hooks/use-voice-call";
import {
	BOT_PERSONALITIES,
	type BotType,
	type FocusMode,
} from "@/lib/bot-personalities";
import { exportConversationToPDF } from "@/lib/conversation-export";
import { ChatSDKError } from "@/lib/errors";
import type { CanvasType, Vote } from "@/lib/supabase/types";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import type { DBMessage } from "@/lib/supabase/types";
import {
	convertToUIMessages,
	fetcher,
	fetchWithErrorHandlers,
	generateUUID,
} from "@/lib/utils";
import { ChatHeader } from "./chat/chat-header";
import { useDataStream } from "./data-stream-provider";
import { ExecutiveLanding } from "./executive-landing";
import { FocusModeChips } from "./focus-mode-chips";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { OnboardingModal } from "./onboarding-modal";
import { ReactionItemsPopup } from "./reaction-items-popup";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import { useSidebar } from "./ui/sidebar";
import type { VisibilityType } from "./visibility-selector";

const Artifact = dynamic(
	() => import("./artifact").then((mod) => ({ default: mod.Artifact })),
	{ ssr: false, loading: () => null },
);
const VoiceCallDialog = dynamic(
	() =>
		import("./chat/voice-call-dialog").then((mod) => ({
			default: mod.VoiceCallDialog,
		})),
	{ ssr: false, loading: () => null },
);
const SwotSlidePanel = dynamic(
	() =>
		import("./swot-slide-panel").then((mod) => ({
			default: mod.SwotSlidePanel,
		})),
	{ ssr: false, loading: () => null },
);
const SupportWidget = dynamic(
	() =>
		import("./support/support-widget").then((mod) => ({
			default: mod.SupportWidget,
		})),
	{ ssr: false, loading: () => null },
);
export interface ChatProps {
	id: string;
	initialMessages: ChatMessage[];
	initialChatModel: string;
	initialVisibilityType: VisibilityType;
	isReadonly: boolean;
	autoResume: boolean;
	chatTopic?: string;
	hasMoreMessages?: boolean;
	initialLastContext?: AppUsage;
	initialBotType?: BotType;
}

export function Chat({
	id,
	initialMessages,
	initialChatModel,
	initialVisibilityType,
	isReadonly,
	autoResume,
	chatTopic,
	hasMoreMessages: initialHasMore = false,
	initialLastContext,
	initialBotType = "collaborative",
}: ChatProps) {
	const router = useRouter();
	const { open } = useSidebar();
	const isMobile = useIsMobile();
	const { visibilityType } = useChatVisibility({
		chatId: id,
		initialVisibilityType,
	});

	const { mutate } = useSWRConfig();
	const { setDataStream } = useDataStream();
	const { setArtifact } = useArtifact();

	// Reset artifact panel when chat ID changes (new conversation)
	// biome-ignore lint/correctness/useExhaustiveDependencies: id is intentionally included to trigger reset on chat change
	useEffect(() => {
		setArtifact(initialArtifactData);
	}, [id, setArtifact]);

	// Cleanup timeout on unmount to prevent memory leaks
	useEffect(() => {
		return () => {
			// Cleanup if needed
		};
	}, []);

	const [input, setInput] = useState<string>("");
	const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
	const [currentModelId, setCurrentModelId] = useState(initialChatModel);
	const [selectedBot, setSelectedBot] = useState<BotType>(initialBotType);
	// DESIGN(DOC-06): Focus mode is intentionally client-state only (resets on page reload).
	// It's a session-level preference, not critical data. Persistence (localStorage or DB)
	// deferred to v2 pending user feedback.
	const [focusMode, setFocusMode] = useState<FocusMode>("default");
	const [reactionPopup, setReactionPopup] = useState<
		"actionable" | "needs_clarification" | "save_for_later" | null
	>(null);
	const [isSwotPanelOpen, setIsSwotPanelOpen] = useState(false);
	const [isSupportOpen, setIsSupportOpen] = useState(false);
	const [isTruncated, setIsTruncated] = useState(false);
	// Pagination state for loading older messages
	const [hasMoreMessages, setHasMoreMessages] = useState(initialHasMore);
	const [isLoadingOlder, setIsLoadingOlder] = useState(false);
	// Store last sent message for retry on error
	const [lastSentMessage, setLastSentMessage] = useState<ChatMessage | null>(
		null,
	);
	const currentModelIdRef = useRef(currentModelId);
	const selectedBotRef = useRef(initialBotType);

	useEffect(() => {
		currentModelIdRef.current = currentModelId;
	}, [currentModelId]);

	useEffect(() => {
		selectedBotRef.current = selectedBot;
	}, [selectedBot]);

	// Strategy Canvas integration
	const [canvasRefreshVersion, setCanvasRefreshVersion] = useState(0);
	const [targetCanvasTab, setTargetCanvasTab] = useState<CanvasType>("swot");
	const processedToolCallIds = useRef<Set<string>>(new Set());

	// Map sections to their canvas types (all lowercase to match tool normalization)
	const sectionToCanvasType: Record<string, CanvasType> = {
		// SWOT
		strengths: "swot",
		weaknesses: "swot",
		opportunities: "swot",
		threats: "swot",
		// BMC (lowercase to match tool normalization)
		keypartners: "bmc",
		keyactivities: "bmc",
		keyresources: "bmc",
		valuepropositions: "bmc",
		customerrelationships: "bmc",
		channels: "bmc",
		customersegments: "bmc",
		coststructure: "bmc",
		revenuestreams: "bmc",
		// Journey
		awareness: "journey",
		consideration: "journey",
		decision: "journey",
		purchase: "journey",
		retention: "journey",
		advocacy: "journey",
		// Brainstorm
		notes: "brainstorm",
	};

	// Handler for bot switching with toast notification
	const handleBotChange = (newBot: BotType) => {
		if (newBot !== selectedBot) {
			const personality = BOT_PERSONALITIES[newBot];
			setSelectedBot(newBot);
			toast({
				type: "success",
				description: `Now consulting with ${personality.name} - ${personality.role}`,
			});
		}
	};

	// Handler for suggestion selection - prefills input
	// Wrapped in useCallback to prevent defeating memo in Messages component
	const handleSuggestionSelect = useCallback((texts: string[]) => {
		setInput(texts.join("\n\n"));
	}, []);

	// Track the botType that was active when the last message was sent
	// This ensures assistant responses show the correct executive even during streaming
	const [activeBotTypeForStreaming, setActiveBotTypeForStreaming] =
		useState<BotType>(initialBotType);

	const {
		messages,
		setMessages,
		sendMessage: originalSendMessage,
		status,
		stop,
		regenerate,
		resumeStream,
		clearError,
	} = useChat<ChatMessage>({
		id,
		messages: initialMessages,
		experimental_throttle: 5,
		generateId: generateUUID,
		transport: new DefaultChatTransport({
			api: "/api/chat",
			fetch: fetchWithErrorHandlers,
			prepareSendMessagesRequest: (request) => {
				// Capture the current bot type at the exact moment of sending
				const currentBotType = selectedBotRef.current;
				// Store this for use during streaming
				setActiveBotTypeForStreaming(currentBotType);
				return {
					body: {
						id: request.id,
						message: request.messages.at(-1),
						selectedChatModel: currentModelIdRef.current,
						selectedVisibilityType: visibilityType,
						selectedBotType: currentBotType,
						focusMode: focusMode,
						...request.body,
					},
				};
			},
		}),
		onData: (dataPart) => {
			// Handle usage data for UI feedback
			if (dataPart.type === "data-usage") {
				setUsage(dataPart.data);
			}

			// SAFE-05: Handle truncation detection from server
			if (dataPart.type === "data-truncated") {
				setIsTruncated(true);
			}

			// Stream immediately for smoother typewriter effect
			setDataStream((ds) => [...(ds || []), dataPart]);
		},
		onFinish: () => {
			// Clear stored message on successful completion
			setLastSentMessage(null);
			mutate(unstable_serialize(getChatHistoryPaginationKey));
			// Note: isTruncated is NOT reset here -- it stays true so the banner
			// remains visible until the user either clicks Continue or sends a new message
		},
		onError: (error) => {
			// Restore last sent message to input for retry
			if (lastSentMessage) {
				const text = (Array.isArray(lastSentMessage.parts) ? lastSentMessage.parts : [])
					.filter((p) => p.type === "text")
					.map((p) => p.text)
					.join("");
				setInput(text);
			}

			// Show user-friendly message for ALL error types
			const message =
				error instanceof ChatSDKError
					? error.message
					: "Something went wrong generating a response. Please try again.";

			toast({
				type: "error",
				description: `${message} Your message has been restored in the input field.`,
			});

			// Clear the stored message after handling error
			setLastSentMessage(null);

			// Reset status from "error" to "ready" so user can send new messages
			clearError();
		},
	});

	// Load older messages for pagination
	const loadOlderMessages = useCallback(async () => {
		if (isLoadingOlder || !hasMoreMessages) return;
		setIsLoadingOlder(true);
		try {
			// Get the oldest message's createdAt as cursor
			const oldestMessage = messages[0];
			const before = oldestMessage?.metadata?.createdAt;
			if (!before) {
				setIsLoadingOlder(false);
				return;
			}

			const params = new URLSearchParams({
				chatId: id,
				before: before as string,
				limit: "50",
			});
			const res = await fetch(`/api/chat/messages?${params.toString()}`);
			if (!res.ok) {
				throw new Error("Failed to load older messages");
			}
			const { messages: olderDbMessages, hasMore } =
				(await res.json()) as {
					messages: DBMessage[];
					hasMore: boolean;
				};

			if (olderDbMessages.length > 0) {
				const olderUIMessages = convertToUIMessages(olderDbMessages);
				setMessages((prev) => [...olderUIMessages, ...prev]);
			}
			setHasMoreMessages(hasMore);
		} catch (err) {
			toast({
				type: "error",
				description: "Failed to load older messages. Please try again.",
			});
		} finally {
			setIsLoadingOlder(false);
		}
	}, [id, messages, isLoadingOlder, hasMoreMessages, setMessages]);

	// Watch for strategyCanvas tool calls to auto-open the panel
	// AI SDK v5: tool parts have type "tool-{toolName}" and state "output-available"
	useEffect(() => {
		const lastMessage = messages.at(-1);
		if (!lastMessage || lastMessage.role !== "assistant") return;

		for (const part of (Array.isArray(lastMessage.parts) ? lastMessage.parts : [])) {
			const partType = (part as any).type as string;
			if (
				partType === "tool-strategyCanvas" &&
				(part as any).state === "output-available" &&
				!processedToolCallIds.current.has((part as any).toolCallId)
			) {
				processedToolCallIds.current.add((part as any).toolCallId);

				// Parse input to find section
				const input = (part as any).input;
				const sectionRaw = input?.section;

				// Normalize section to lowercase to handle model variations (e.g. "Strengths" vs "strengths")
				const section = sectionRaw?.toLowerCase();

				if (section && sectionToCanvasType[section]) {
					const canvasType = sectionToCanvasType[section];
					setTargetCanvasTab(canvasType);
					setCanvasRefreshVersion((prev) => prev + 1);
					setIsSwotPanelOpen(true);

					toast({
						type: "success",
						description: `Updated ${canvasType.toUpperCase()} canvas`,
					});
				}
			}
		}
	}, [messages]);

	// Wrap sendMessage to capture the botType at send time and store message for rollback
	const sendMessage = (message: Parameters<typeof originalSendMessage>[0]) => {
		setIsTruncated(false);
		setActiveBotTypeForStreaming(selectedBot);
		// Store message for potential rollback on error
		setLastSentMessage(message as ChatMessage);
		return originalSendMessage(message);
	};

	// Sync selectedBot with incoming assistant messages
	useEffect(() => {
		const lastAssistantMessage = messages
			.filter((msg) => msg.role === "assistant")
			.at(-1);

		if (lastAssistantMessage?.metadata?.botType) {
			const messageBotType = lastAssistantMessage.metadata.botType as BotType;
			if (messageBotType !== selectedBot) {
				setSelectedBot(messageBotType);
			}
		}
	}, [messages, selectedBot]);

	const searchParams = useSearchParams();
	const query = searchParams.get("query");

	const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

	const sendMessageRef = useRef(sendMessage);
	sendMessageRef.current = sendMessage;

	useEffect(() => {
		if (query && !hasAppendedQuery) {
			sendMessageRef.current({
				role: "user" as const,
				parts: [{ type: "text", text: query }],
			});

			setHasAppendedQuery(true);
			window.history.replaceState({}, "", `/chat/${id}`);
		}
	}, [query, hasAppendedQuery, id]);

	const { data: votes } = useSWR<Vote[]>(
		messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
		fetcher,
	);

	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

	useAutoResume({
		autoResume,
		initialMessages,
		resumeStream,
		setMessages,
	});

	// Auto-speak functionality - speaks assistant responses automatically when streaming completes
	// Defaults to ON and persists user preference to localStorage
	useAutoSpeak({
		messages,
		status,
		botType: activeBotTypeForStreaming,
	});

	// Export conversation handlers
	const [isExporting, setIsExporting] = useState(false);

	const handleExportPDF = async () => {
		if (messages.length === 0 || isExporting) return;
		setIsExporting(true);
		try {
			const chatTitle = chatTopic || "Conversation";
			await exportConversationToPDF(messages, chatTitle, selectedBot);
			toast({ type: "success", description: "Conversation exported to PDF" });
		} catch (error) {
			console.error("Export failed:", error);
			toast({ type: "error", description: "Failed to export conversation" });
		} finally {
			setIsExporting(false);
		}
	};

	// Voice call functionality (extracted to custom hook)
	const {
		voiceCallOpen,
		voiceCallStatus,
		voiceTranscript,
		voiceCallError,
		voiceCallDuration,
		setVoiceCallOpen,
		startVoiceCall,
		endVoiceCall,
		formatDuration,
	} = useVoiceCall({
		selectedBot,
		messages,
		status,
		sendMessage,
	});

	const personality = BOT_PERSONALITIES[selectedBot];

	return (
		<>
			<div className="flex h-dvh w-full overflow-hidden bg-background">
				{/* Chat Area - compresses when panel opens */}
				<div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
					{/* Subtle red accent glow - minimalist */}
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 overflow-hidden"
					>
						<div className="absolute -top-40 left-1/3 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
					</div>

					<div className="relative z-10 flex h-full w-full flex-col">
						<ChatHeader
							isExporting={isExporting}
							messages={messages}
							onBotChange={handleBotChange}
							onExportPDF={handleExportPDF}
							onNewChat={() => {
								router.push("/new");
								router.refresh();
							}}
							onOpenReactionPopup={setReactionPopup}
							onOpenSupport={() => setIsSupportOpen(true)}
							onOpenSwotPanel={() => setIsSwotPanelOpen(true)}
							selectedBot={selectedBot}
							showNewButton={!open || isMobile}
						/>

						{/* Main Content */}
						<main className="relative flex-1 overflow-hidden">
							{messages.length === 0 ? (
								<div className="h-full overflow-auto">
									<ExecutiveLanding
										onSelect={handleBotChange}
										selectedBot={selectedBot}
									/>
								</div>
							) : (
								<div className="flex h-full w-full flex-col overflow-hidden">
									{/* Messages - full height */}
									<div className="flex-1 overflow-hidden">
										<Messages
											chatId={id}
											chatTopic={chatTopic}
											className="h-full"
											hasMoreMessages={hasMoreMessages}
											isArtifactVisible={isArtifactVisible}
											isLoadingOlder={isLoadingOlder}
											isReadonly={isReadonly}
											messages={messages}
											onLoadOlder={loadOlderMessages}
											onSuggestionSelect={handleSuggestionSelect}
											regenerate={regenerate}
											selectedBotType={activeBotTypeForStreaming}
											selectedModelId={initialChatModel}
											setMessages={setMessages}
											status={status}
											votes={votes}
										/>
									</div>

									{/* SAFE-05: Truncation notice when AI hits maxOutputTokens */}
									{isTruncated && status === "ready" && (
										<div className="mx-auto w-full max-w-3xl px-4 pb-2">
											<div className="flex items-center gap-2 rounded-lg border border-amber-200/50 bg-amber-50/50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-200">
												<span>
													This response was truncated due to length limits.
												</span>
												<button
													type="button"
													className="ml-auto shrink-0 font-medium underline underline-offset-2 hover:no-underline"
													onClick={() => {
														setInput(
															"Please continue your previous response from where you left off.",
														);
														setIsTruncated(false);
													}}
												>
													Continue
												</button>
											</div>
										</div>
									)}
								</div>
							)}
						</main>

						{/* Input Area - Clean minimalist */}
						{!isReadonly && (
							<div className="flex-shrink-0 border-t border-border bg-background/80 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 sm:pt-4 sm:pb-6">
								<div className="w-full space-y-2">
									{/* Focus Mode Chips */}
									<FocusModeChips
										botType={selectedBot}
										currentMode={focusMode}
										onModeChange={setFocusMode}
									/>
									<MultimodalInput
										attachments={attachments}
										chatId={id}
										input={input}
										messages={messages}
										onModelChange={setCurrentModelId}
										selectedModelId={currentModelId}
										selectedVisibilityType={visibilityType}
										sendMessage={sendMessage}
										setAttachments={setAttachments}
										setInput={setInput}
										setMessages={setMessages}
										status={status}
										stop={stop}
										usage={usage}
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Strategy Canvas Panel - part of flex layout */}
				<SwotSlidePanel
					isOpen={isSwotPanelOpen}
					onClose={() => setIsSwotPanelOpen(false)}
					activeTab={targetCanvasTab}
					refreshKey={canvasRefreshVersion}
				/>

				{/* Support Widget */}
				<SupportWidget open={isSupportOpen} onOpenChange={setIsSupportOpen} />
			</div>

			<Artifact
				attachments={attachments}
				chatId={id}
				input={input}
				isReadonly={isReadonly}
				messages={messages}
				regenerate={regenerate}
				selectedBotType={selectedBot}
				selectedModelId={currentModelId}
				selectedVisibilityType={visibilityType}
				sendMessage={sendMessage}
				setAttachments={setAttachments}
				setInput={setInput}
				setMessages={setMessages}
				status={status}
				stop={stop}
				votes={votes}
			/>

			<VoiceCallDialog
				duration={voiceCallDuration}
				error={voiceCallError}
				formatDuration={formatDuration}
				onEndCall={endVoiceCall}
				onOpenChange={setVoiceCallOpen}
				onStartCall={startVoiceCall}
				open={voiceCallOpen}
				personality={personality}
				status={voiceCallStatus}
				transcript={voiceTranscript}
			/>

			{/* Onboarding Modal - collects user profile info if not set */}
			<OnboardingModal />

			{/* Reaction Items Popup - Action Items, Clarifications, Saved */}
			{reactionPopup && (
				<ReactionItemsPopup
					type={reactionPopup}
					open={!!reactionPopup}
					onOpenChange={(open) => !open && setReactionPopup(null)}
				/>
			)}
		</>
	);
}
