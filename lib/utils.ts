import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from "ai";
import { type ClassValue, clsx } from "clsx";
import { formatISO } from "date-fns";
import { twMerge } from "tailwind-merge";
import type { DBMessage, Document } from "@/lib/supabase/types";
import { ChatSDKError, type ErrorCode } from "./errors";
import type { ChatMessage, ChatTools, CustomUIDataTypes } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// CSRF token management
const CSRF_HEADER_NAME = "x-csrf-token";
let csrfToken: string | null = null;
let csrfInitPromise: Promise<string | null> | null = null;

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Initialize CSRF token - call this on app startup
 * Returns cached promise to prevent concurrent fetches
 */
export async function initCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;

  if (csrfInitPromise) return csrfInitPromise;

  csrfInitPromise = (async () => {
    try {
      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to fetch CSRF token");
        return null;
      }

      const data = await response.json();
      csrfToken = data.token;
      return csrfToken;
    } catch (error) {
      console.error("CSRF initialization error:", error);
      return null;
    } finally {
      csrfInitPromise = null;
    }
  })();

  return csrfInitPromise;
}

export const fetcher = async (url: string) => {
  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers[CSRF_HEADER_NAME] = csrfToken;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    // Ensure CSRF token is initialized before making requests
    if (!csrfToken && typeof window !== "undefined") {
      await initCsrfToken();
    }

    // Add CSRF header to request
    const headers = new Headers(init?.headers);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }

    const response = await fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) {
    return new Date();
  }
  if (index > documents.length) {
    return new Date();
  }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) {
    return null;
  }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  let result = text.replace("<has_function_call>", "");

  // Remove suggestions block with code fence
  result = result.replace(/```suggestions\s*[\s\S]*?```/g, "");

  // Remove raw JSON suggestions array at the end of message
  // Matches: [{"category": "...", "text": "..."}, ...]
  result = result.replace(
    /\n*\[\s*\{[\s\S]*?"category"[\s\S]*?"text"[\s\S]*?\}\s*\]\s*$/g,
    "",
  );

  return result.trim();
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
      ...(message.botType && {
        botType: message.botType as "alexandria" | "kim" | "collaborative",
      }),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}
