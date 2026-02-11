import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Audit action types for tracking sensitive operations
 */
export const AuditActions = {
  // Chat operations
  CHAT_DELETE: "CHAT_DELETE",
  CHAT_DELETE_ALL: "CHAT_DELETE_ALL",

  // Document operations
  DOCUMENT_DELETE: "DOCUMENT_DELETE",
  DOCUMENT_CREATE: "DOCUMENT_CREATE",

  // Message operations
  MESSAGE_DELETE: "MESSAGE_DELETE",

  // User operations
  ACCOUNT_DELETE: "ACCOUNT_DELETE",
  PROFILE_UPDATE: "PROFILE_UPDATE",
  TOS_ACCEPT: "TOS_ACCEPT",

  // Data operations
  DATA_EXPORT: "DATA_EXPORT",

  // Auth operations
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",

  // Canvas operations
  CANVAS_DELETE: "CANVAS_DELETE",

  // Summary operations
  SUMMARY_DELETE: "SUMMARY_DELETE",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

/**
 * Resource types that can be audited
 */
export const AuditResources = {
  USER: "user",
  CHAT: "chat",
  MESSAGE: "message",
  DOCUMENT: "document",
  CANVAS: "canvas",
  SUMMARY: "summary",
  AUTH: "auth",
  DATA: "data",
} as const;

export type AuditResource =
  (typeof AuditResources)[keyof typeof AuditResources];

interface AuditLogInput {
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | null;
  details?: Record<string, string | number | boolean | null>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Logs an audit event to the AuditLog table.
 * Uses service role client to bypass RLS (audit logs should always be written).
 * Fails silently to prevent audit logging from breaking the main operation.
 *
 * @param input - The audit log entry to create
 * @returns Promise<void> - Resolves when logging is complete (or failed silently)
 *
 * @example
 * await logAudit({
 *   userId: user.id,
 *   action: AuditActions.CHAT_DELETE,
 *   resource: AuditResources.CHAT,
 *   resourceId: chatId,
 *   details: { reason: "user_requested" }
 * });
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { error } = await supabase.from("AuditLog").insert({
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      details: input.details ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });

    if (error) {
      // Log to console but don't throw - audit logging should never break the main operation
      console.error("[AuditLog] Failed to write audit log:", error.message, {
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
      });
    }
  } catch (error) {
    // Fail silently - audit logging should never break the main operation
    console.error("[AuditLog] Exception during audit logging:", error);
  }
}

/**
 * Helper to extract IP address from request headers
 */
export function getClientIP(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP in the chain (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP.split(",")[0].trim();
  }

  return null;
}

/**
 * Helper to get user agent from request
 */
export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}

/**
 * Convenience function to log audit with request context
 */
export async function logAuditWithRequest(
  request: Request,
  input: Omit<AuditLogInput, "ipAddress" | "userAgent">,
): Promise<void> {
  return logAudit({
    ...input,
    ipAddress: getClientIP(request),
    userAgent: getUserAgent(request),
  });
}
