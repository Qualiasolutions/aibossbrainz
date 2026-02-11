"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import { Trigger } from "@radix-ui/react-select";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { SelectItem } from "@/components/ui/select";
import { useWindowSize } from "@/hooks/use-window-size";
import { chatModels } from "@/lib/ai/models";
import type { Attachment, ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputSubmit,
  PromptInputTextarea,
} from "./elements/prompt-input";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  CpuIcon,
  PaperclipIcon,
  StopIcon,
} from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";
import { VoiceInputButton } from "./voice-input-button";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  usage,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  usage?: AppUsage;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "20px";
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [adjustHeight]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "20px";
    }
  }, []);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    "",
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustHeight, localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      const sanitized = transcript.trim();
      if (!sanitized) {
        return;
      }

      startTransition(() => {
        setInput((currentValue) => {
          if (!currentValue) {
            return sanitized;
          }

          const spacing = currentValue.endsWith(" ") ? "" : " ";
          return `${currentValue}${spacing}${sanitized}`;
        });
      });

      requestAnimationFrame(() => {
        adjustHeight();
        textareaRef.current?.focus();
      });
    },
    [adjustHeight, setInput],
  );

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`);

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    resetHeight();
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
    resetHeight,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  // Slim single-line input styling
  const promptContainerClass =
    "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-all duration-300 focus-within:border-red-500/30 focus-within:shadow-[0_2px_12px_rgba(0,0,0,0.3),0_0_0_1px_rgba(220,38,38,0.15)]";

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile],
  );

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-1.5 sm:gap-2",
        className,
      )}
    >
      <input
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <PromptInput
        className={promptContainerClass}
        onSubmit={(event) => {
          event.preventDefault();
          if (status !== "ready") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            submitForm();
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-1 overflow-x-scroll sm:gap-1.5"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url),
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="flex flex-row items-center gap-1.5">
          <AttachmentsButton
            fileInputRef={fileInputRef}
            selectedModelId={selectedModelId}
            status={status}
          />
          <VoiceInputButton
            className="size-6 rounded text-muted-foreground/70 transition-colors duration-200 hover:text-red-400"
            disabled={status !== "ready"}
            onTranscript={handleVoiceTranscript}
            size="sm"
          />
          <PromptInputTextarea
            autoFocus
            className="grow resize-none border-0! border-none! bg-transparent py-0.5 pl-0 text-xs leading-normal text-foreground caret-primary outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground placeholder:text-xs placeholder:pl-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={28}
            minHeight={20}
            onChange={handleInput}
            placeholder="Message your executive team..."
            ref={textareaRef}
            rows={1}
            value={input}
          />
          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className="size-6 rounded bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm transition-all hover:from-red-400 hover:to-red-500 disabled:from-white/10 disabled:to-white/5 disabled:text-muted-foreground disabled:shadow-none shrink-0"
              disabled={!input.trim() || uploadQueue.length > 0}
              status={status}
            >
              <ArrowUpIcon size={12} />
            </PromptInputSubmit>
          )}
        </div>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const isReasoningModel = selectedModelId === "chat-model-reasoning";

  return (
    <Button
      aria-label="Upload files"
      className="size-6 rounded p-0 text-muted-foreground/70 transition-colors duration-200 hover:bg-transparent hover:text-red-400"
      data-testid="attachments-button"
      disabled={status !== "ready" || isReasoningModel}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [optimisticModelId, setOptimisticModelId] = useState(selectedModelId);
  const [isOpen, setIsOpen] = useState(false);
  const { width } = useWindowSize();

  useEffect(() => {
    setOptimisticModelId(selectedModelId);
  }, [selectedModelId]);

  const selectedModel = chatModels.find(
    (model) => model.id === optimisticModelId,
  );

  // SSR-safe mobile check (width is 0 on server, real value after hydration)
  const isMobile = width > 0 && width < 640;

  const getModelIcon = (modelId: string) => {
    switch (modelId) {
      case "chat-model":
        return (
          <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-blue-500 to-indigo-600">
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                clipRule="evenodd"
                d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 100-12 6 6 0 000 12z"
                fillRule="evenodd"
              />
            </svg>
          </div>
        );
      case "chat-model-reasoning":
        return (
          <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-pink-600">
            <svg
              className="h-2.5 w-2.5 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                clipRule="evenodd"
                d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3h4v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                fillRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-gray-500 to-gray-600">
            <CpuIcon size={10} />
          </div>
        );
    }
  };

  return (
    <PromptInputModelSelect
      onOpenChange={setIsOpen}
      onValueChange={(modelName) => {
        const model = chatModels.find((m) => m.name === modelName);
        if (model) {
          setOptimisticModelId(model.id);
          onModelChange?.(model.id);
          startTransition(() => {
            saveChatModelAsCookie(model.id);
          });
        }
      }}
      open={isOpen}
      value={selectedModel?.name}
    >
      <Trigger
        className="group hover:-translate-y-0.5 flex h-7 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-medium text-[10px] text-foreground shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-red-500/30 hover:bg-white/10 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-background sm:h-8 sm:gap-2 sm:rounded-xl sm:px-2.5 sm:text-xs lg:h-9 lg:px-3 lg:text-sm"
        type="button"
      >
        <div className="relative">
          {getModelIcon(optimisticModelId)}
          <div className="-bottom-0.5 -right-0.5 absolute">
            <div className="h-1.5 w-1.5 rounded-full border border-background bg-red-500" />
          </div>
        </div>
        <span className="hidden font-semibold text-[10px] text-foreground sm:inline sm:text-xs lg:text-sm">
          {isMobile ? selectedModel?.name.split(" ")[0] : selectedModel?.name}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-muted-foreground">
            <ChevronDownIcon size={12} />
          </div>
        </motion.div>
      </Trigger>
      <PromptInputModelSelectContent className="min-w-[280px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-0 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="p-2">
          <div className="mb-2 border-white/10 border-b px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-red-500 to-red-600">
                <div className="text-black">
                  <CpuIcon size={10} />
                </div>
              </div>
              <span className="font-semibold text-foreground text-sm">
                AI Model
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {chatModels.map((model) => {
              const isSelected = model.id === optimisticModelId;
              return (
                <SelectItem
                  className={cn(
                    "relative cursor-pointer rounded-xl px-3 py-3 transition-all duration-200",
                    "border border-transparent hover:border-red-500/30 hover:bg-white/10",
                    isSelected && "border-red-500/30 bg-red-500/10",
                  )}
                  key={model.id}
                  value={model.name}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5">
                      {getModelIcon(model.id)}
                      {isSelected && (
                        <div className="-bottom-0.5 -right-0.5 absolute">
                          <div className="h-2 w-2 rounded-full border border-background bg-red-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 font-semibold text-foreground text-sm">
                        {model.name}
                      </div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        {model.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="ml-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20">
                          <svg
                            className="h-3 w-3 text-red-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              clipRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              fillRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </div>
        </div>
      </PromptInputModelSelectContent>
    </PromptInputModelSelect>
  );
}

const _ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      aria-label="Stop generating"
      className="size-11 rounded-xl bg-stone-900 text-white transition-colors duration-200 hover:bg-stone-800"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={16} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
