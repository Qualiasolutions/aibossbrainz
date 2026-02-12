import type { UseChatHelpers } from "@ai-sdk/react";
import { formatDistance } from "date-fns";
import equal from "fast-deep-equal";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import {
	type Dispatch,
	memo,
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import useSWR, { useSWRConfig } from "swr";
import { useDebounceCallback } from "usehooks-ts";
import { codeArtifact } from "@/artifacts/code/client";
import { imageArtifact } from "@/artifacts/image/client";
import { sheetArtifact } from "@/artifacts/sheet/client";
import { textArtifact } from "@/artifacts/text/client";
import { useArtifact } from "@/hooks/use-artifact";
import { useCsrf } from "@/hooks/use-csrf";
import { useWindowSize } from "@/hooks/use-window-size";
import type { BotType } from "@/lib/bot-personalities";
import type { Document, Vote } from "@/lib/supabase/types";
import type { Attachment, ChatMessage } from "@/lib/types";
import { fetcher } from "@/lib/utils";
import { ArtifactActions } from "./artifact-actions";
import { ArtifactCloseButton } from "./artifact-close-button";
import { Toolbar } from "./toolbar";
import { useSidebar } from "./ui/sidebar";
import { VersionFooter } from "./version-footer";
import type { VisibilityType } from "./visibility-selector";

// Note: strategyCanvasArtifact removed - canvas saves directly to /strategy-canvas page
export const artifactDefinitions = [
	textArtifact,
	codeArtifact,
	imageArtifact,
	sheetArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]["kind"];

export type UIArtifact = {
	title: string;
	documentId: string;
	kind: ArtifactKind;
	content: string;
	isVisible: boolean;
	status: "streaming" | "idle";
	boundingBox: {
		top: number;
		left: number;
		width: number;
		height: number;
	};
};

function PureArtifact({
	status,
	stop,
	sendMessage,
	setMessages,
}: {
	chatId: string;
	input: string;
	setInput: Dispatch<SetStateAction<string>>;
	status: UseChatHelpers<ChatMessage>["status"];
	stop: UseChatHelpers<ChatMessage>["stop"];
	attachments: Attachment[];
	setAttachments: Dispatch<SetStateAction<Attachment[]>>;
	messages: ChatMessage[];
	setMessages: UseChatHelpers<ChatMessage>["setMessages"];
	votes: Vote[] | undefined;
	sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
	regenerate: UseChatHelpers<ChatMessage>["regenerate"];
	isReadonly: boolean;
	selectedVisibilityType: VisibilityType;
	selectedModelId: string;
	selectedBotType: BotType;
}) {
	const { artifact, setArtifact, metadata, setMetadata } = useArtifact();
	const { csrfFetch } = useCsrf();

	// Track streaming→idle transitions to save content
	const [postStreamReady, setPostStreamReady] = useState(true);
	const prevArtifactStatusRef = useRef(artifact.status);
	// Use refs to capture artifact values for save without causing re-runs
	const artifactRef = useRef(artifact);
	artifactRef.current = artifact;
	// Track whether server-side handler already saved (prevents double save)
	const serverSavedRef = useRef(false);

	useEffect(() => {
		if (
			prevArtifactStatusRef.current === "streaming" &&
			artifact.status === "idle"
		) {
			const currentArtifact = artifactRef.current;

			if (
				currentArtifact.documentId !== "init" &&
				currentArtifact.content &&
				currentArtifact.content.trim() !== "" &&
				currentArtifact.content !== "{}"
			) {
				// Save streamed content as a backup, using CSRF-authenticated fetch.
				// The server-side handler (createDocumentHandler) saves first,
				// but this ensures content is persisted even if that save failed.
				console.log(
					`[Artifact] Backup save: ${currentArtifact.content.length} chars for "${currentArtifact.title}"`,
				);

				csrfFetch(`/api/document?id=${currentArtifact.documentId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						title: currentArtifact.title,
						content: currentArtifact.content,
						kind: currentArtifact.kind,
					}),
				})
					.then((res) => {
						if (!res.ok) {
							console.error(`[Artifact] Backup save failed: ${res.status}`);
						} else {
							console.log("[Artifact] Backup save succeeded");
							serverSavedRef.current = true;
						}
					})
					.catch((error) => {
						console.error("[Artifact] Backup save error:", error);
					})
					.finally(() => {
						// Allow DB fetch after save attempt completes (whether success or failure)
						setPostStreamReady(true);
					});
			} else {
				console.warn(
					`[Artifact] No content to save for "${currentArtifact.title}" (${currentArtifact.content?.length || 0} chars)`,
				);
				// Still allow DB fetch even if nothing to save
				setPostStreamReady(true);
			}

			// Block DB fetch until save completes (set above in .finally())
			setPostStreamReady(false);
			prevArtifactStatusRef.current = artifact.status;
			return;
		}
		prevArtifactStatusRef.current = artifact.status;
	}, [artifact.status, csrfFetch]);

	const { data: documents, mutate: mutateDocuments } = useSWR<Document[]>(
		artifact.documentId !== "init" &&
			artifact.status !== "streaming" &&
			postStreamReady
			? `/api/document?id=${artifact.documentId}`
			: null,
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnMount: true,
			dedupingInterval: 0,
		},
	);

	const [mode, setMode] = useState<"edit" | "diff">("edit");
	const [document, setDocument] = useState<Document | null>(null);
	const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);

	const { open: isSidebarOpen } = useSidebar();

	// Reset local state when document ID changes
	useEffect(() => {
		if (artifact.documentId !== "init") {
			setDocument(null);
			setCurrentVersionIndex(-1);
			serverSavedRef.current = false;
		}
	}, [artifact.documentId]);

	// Update content when documents are fetched
	useEffect(() => {
		if (documents && documents.length > 0) {
			const mostRecentDocument = documents.at(-1);

			if (mostRecentDocument) {
				setDocument(mostRecentDocument);
				setCurrentVersionIndex(documents.length - 1);
				// Only overwrite artifact content if DB actually has content.
				// Prevents stale/empty DB data from wiping good streaming content.
				const dbContent = mostRecentDocument.content;
				if (dbContent && dbContent.trim() !== "") {
					setArtifact((currentArtifact) => {
						// Don't overwrite if we already have content and DB content is shorter
						// This prevents race conditions where stale DB data overwrites fresh streamed content
						if (
							currentArtifact.content &&
							currentArtifact.content.trim() !== "" &&
							currentArtifact.content.length > dbContent.length
						) {
							console.log(
								"[Artifact] Keeping streamed content over shorter DB content",
							);
							return currentArtifact;
						}
						return {
							...currentArtifact,
							content: dbContent,
						};
					});
				} else {
					console.warn(
						"[Artifact] DB returned empty content, keeping streamed content",
					);
				}
			}
		}
	}, [documents, setArtifact]);

	// Revalidate on visibility change
	useEffect(() => {
		if (artifact.isVisible && artifact.documentId !== "init") {
			mutateDocuments();
		}
	}, [artifact.isVisible, artifact.documentId, mutateDocuments]);

	const { mutate } = useSWRConfig();
	const [isContentDirty, setIsContentDirty] = useState(false);

	const handleContentChange = useCallback(
		(updatedContent: string) => {
			if (!artifact) {
				return;
			}

			mutate<Document[]>(
				`/api/document?id=${artifact.documentId}`,
				async (currentDocuments) => {
					if (!currentDocuments) {
						return [];
					}

					const currentDocument = currentDocuments.at(-1);

					if (!currentDocument || !currentDocument.content) {
						setIsContentDirty(false);
						return currentDocuments;
					}

					if (currentDocument.content !== updatedContent) {
						await csrfFetch(`/api/document?id=${artifact.documentId}`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								title: artifact.title,
								content: updatedContent,
								kind: artifact.kind,
							}),
						});

						setIsContentDirty(false);

						const newDocument = {
							...currentDocument,
							content: updatedContent,
							createdAt: new Date().toISOString(),
						};

						return [...currentDocuments, newDocument];
					}
					return currentDocuments;
				},
				{ revalidate: false },
			);
		},
		[artifact, mutate, csrfFetch],
	);

	const debouncedHandleContentChange = useDebounceCallback(
		handleContentChange,
		2000,
	);

	const saveContent = useCallback(
		(updatedContent: string, debounce: boolean) => {
			if (document && updatedContent !== document.content) {
				setIsContentDirty(true);

				if (debounce) {
					debouncedHandleContentChange(updatedContent);
				} else {
					handleContentChange(updatedContent);
				}
			}
		},
		[document, debouncedHandleContentChange, handleContentChange],
	);

	function getDocumentContentById(index: number) {
		if (!documents) {
			return "";
		}
		if (!documents[index]) {
			return "";
		}
		return documents[index].content ?? "";
	}

	const handleVersionChange = (type: "next" | "prev" | "toggle" | "latest") => {
		if (!documents) {
			return;
		}

		if (type === "latest") {
			setCurrentVersionIndex(documents.length - 1);
			setMode("edit");
		}

		if (type === "toggle") {
			setMode((currentMode) => (currentMode === "edit" ? "diff" : "edit"));
		}

		if (type === "prev") {
			if (currentVersionIndex > 0) {
				setCurrentVersionIndex((index) => index - 1);
			}
		} else if (type === "next" && currentVersionIndex < documents.length - 1) {
			setCurrentVersionIndex((index) => index + 1);
		}
	};

	const [isToolbarVisible, setIsToolbarVisible] = useState(false);

	/*
	 * NOTE: if there are no documents, or if
	 * the documents are being fetched, then
	 * we mark it as the current version.
	 */

	const isCurrentVersion =
		documents && documents.length > 0
			? currentVersionIndex === documents.length - 1
			: true;

	const { width: windowWidth, height: windowHeight } = useWindowSize();
	const isMobile = windowWidth ? windowWidth < 768 : false;

	const artifactDefinition = artifactDefinitions.find(
		(definition) => definition.kind === artifact.kind,
	);

	if (!artifactDefinition) {
		throw new Error("Artifact definition not found!");
	}

	useEffect(() => {
		if (artifact.documentId !== "init" && artifactDefinition.initialize) {
			artifactDefinition.initialize({
				documentId: artifact.documentId,
				setMetadata,
			});
		}
	}, [artifact.documentId, artifactDefinition, setMetadata]);

	// Determine if content is effectively empty (for regenerate button)
	const effectiveContent = isCurrentVersion
		? document?.content || artifact.content || ""
		: getDocumentContentById(currentVersionIndex);

	const isEffectivelyEmpty =
		artifact.status === "idle" &&
		artifact.documentId !== "init" &&
		(!effectiveContent || effectiveContent.trim() === "");

	const handleRegenerate = useCallback(() => {
		sendMessage({
			role: "user",
			parts: [
				{
					type: "text",
					text: `Please regenerate the document "${artifact.title}". The previous generation produced empty content.`,
				},
			],
		});
	}, [sendMessage, artifact.title]);

	return (
		<AnimatePresence>
			{artifact.isVisible && (
				<motion.div
					animate={{ opacity: 1 }}
					className="fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-row bg-transparent"
					data-testid="artifact"
					exit={{ opacity: 0, transition: { delay: 0.4 } }}
					initial={{ opacity: 1 }}
				>
					{!isMobile && (
						<motion.div
							animate={{ width: windowWidth, right: 0 }}
							className="fixed h-dvh bg-background"
							exit={{
								width: isSidebarOpen ? windowWidth - 256 : windowWidth,
								right: 0,
							}}
							initial={{
								width: isSidebarOpen ? windowWidth - 256 : windowWidth,
								right: 0,
							}}
						/>
					)}

					<motion.div
						animate={{
							opacity: 1,
							x: 0,
							y: 0,
							height: windowHeight,
							width: windowWidth ? windowWidth : "calc(100dvw)",
							borderRadius: 0,
							transition: {
								delay: 0,
								type: "spring",
								stiffness: 300,
								damping: 30,
								duration: 0.8,
							},
						}}
						className="fixed flex h-dvh flex-col overflow-y-scroll border border-border/70 bg-background/95 shadow-2xl shadow-primary/10 backdrop-blur-xl dark:bg-background/95 dark:border-border/50 md:border-l md:min-w-[500px] md:max-w-none"
						exit={{
							opacity: 0,
							scale: 0.5,
							transition: {
								delay: 0.1,
								type: "spring",
								stiffness: 600,
								damping: 30,
							},
						}}
						initial={
							isMobile
								? {
										opacity: 1,
										x: artifact.boundingBox.left,
										y: artifact.boundingBox.top,
										height: artifact.boundingBox.height,
										width: artifact.boundingBox.width,
										borderRadius: 50,
									}
								: {
										opacity: 1,
										x: artifact.boundingBox.left,
										y: artifact.boundingBox.top,
										height: artifact.boundingBox.height,
										width: artifact.boundingBox.width,
										borderRadius: 50,
									}
						}
					>
						<div className="flex flex-row items-start justify-between border-border/60 border-b px-5 py-4">
							<div className="flex flex-row items-start gap-4">
								<ArtifactCloseButton />

								<div className="flex flex-col">
									<div className="font-semibold text-base text-foreground">
										{artifact.title}
									</div>

									{isContentDirty ? (
										<div className="font-medium text-primary text-xs uppercase tracking-wide">
											Saving changes...
										</div>
									) : document ? (
										<div className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
											{`Updated ${formatDistance(
												new Date(document.createdAt),
												new Date(),
												{
													addSuffix: true,
												},
											)}`}
										</div>
									) : (
										<div className="mt-2 h-3 w-32 animate-pulse rounded-md bg-primary/20" />
									)}
								</div>
							</div>

							<ArtifactActions
								artifact={artifact}
								currentVersionIndex={currentVersionIndex}
								handleVersionChange={handleVersionChange}
								isCurrentVersion={isCurrentVersion}
								metadata={metadata}
								mode={mode}
								setMetadata={setMetadata}
							/>
						</div>

						<div className="flex-1 min-h-0 overflow-auto bg-background/90 dark:bg-background/90">
							<div className="h-full w-full min-w-fit">
								{isEffectivelyEmpty ? (
									<div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
										<div className="text-muted-foreground text-sm">
											Document content failed to generate.
										</div>
										<button
											className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
											onClick={handleRegenerate}
											type="button"
										>
											<RefreshCw className="size-4" />
											Regenerate Document
										</button>
									</div>
								) : (
									<artifactDefinition.content
										content={effectiveContent}
										currentVersionIndex={currentVersionIndex}
										getDocumentContentById={getDocumentContentById}
										isCurrentVersion={isCurrentVersion}
										isInline={false}
										isLoading={
											artifact.status === "streaming" && !effectiveContent
										}
										metadata={metadata}
										mode={mode}
										onSaveContent={saveContent}
										setMetadata={setMetadata}
										status={artifact.status}
										suggestions={[]}
										title={artifact.title}
									/>
								)}
							</div>

							<AnimatePresence>
								{isCurrentVersion && (
									<Toolbar
										artifactKind={artifact.kind}
										isToolbarVisible={isToolbarVisible}
										sendMessage={sendMessage}
										setIsToolbarVisible={setIsToolbarVisible}
										setMessages={setMessages}
										status={status}
										stop={stop}
									/>
								)}
							</AnimatePresence>
						</div>

						<AnimatePresence>
							{!isCurrentVersion && (
								<VersionFooter
									currentVersionIndex={currentVersionIndex}
									documents={documents}
									handleVersionChange={handleVersionChange}
								/>
							)}
						</AnimatePresence>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

export const Artifact = memo(PureArtifact, (prevProps, nextProps) => {
	if (prevProps.status !== nextProps.status) {
		return false;
	}
	if (!equal(prevProps.votes, nextProps.votes)) {
		return false;
	}
	if (prevProps.input !== nextProps.input) {
		return false;
	}
	if (prevProps.selectedBotType !== nextProps.selectedBotType) {
		return false;
	}
	if (!equal(prevProps.messages.length, nextProps.messages.length)) {
		return false;
	}
	if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
		return false;
	}

	return true;
});
