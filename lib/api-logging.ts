/**
 * Centralized API logging utilities
 * Provides request-scoped logging with request IDs and user context
 */

import { headers } from "next/headers";
import type { Logger } from "pino";
import { logger as baseLogger } from "./logger";

/**
 * Get or create a request-scoped logger
 * This reads the x-request-id header that middleware sets
 */
export async function getApiLogger(context?: {
  requestId?: string;
  userId?: string;
  route?: string;
}): Promise<Logger> {
  const requestId = context?.requestId || (await getRequestIdFromHeaders());
  const childLogger = baseLogger.child({
    ...(requestId && { requestId }),
    ...(context?.userId && { userId: context.userId }),
    ...(context?.route && { route: context.route }),
  });
  return childLogger;
}

/**
 * Extract request ID from Next.js headers()
 * Works in API routes and Server Components
 */
async function getRequestIdFromHeaders(): Promise<string | undefined> {
  try {
    const headersList = await headers();
    return headersList.get("x-request-id") || undefined;
  } catch {
    // headers() throws in non-async contexts or outside app router
    return undefined;
  }
}

/**
 * API request logger with automatic timing
 * Usage:
 *   const apiLog = apiRequestLogger("/api/chat");
 *   apiLog.start({ userId });
 *   // ... do work ...
 *   apiLog.success({ messageCount: 5 });
 */
export function apiRequestLogger(route: string) {
  const startTime = Date.now();
  let childLogger: Logger;
  let requestId: string | undefined;

  return {
    /**
     * Call at the start of request handling
     */
    start(context?: { userId?: string; requestId?: string }) {
      // Use provided requestId or generate one synchronously
      requestId = context?.requestId || crypto.randomUUID().slice(0, 8);
      childLogger = baseLogger.child({
        requestId,
        route,
        ...(context?.userId && { userId: context.userId }),
      });
      childLogger.info({ route, phase: "start" }, `Request started: ${route}`);
    },

    /**
     * Call on successful completion
     */
    success(data?: Record<string, unknown>) {
      const duration = Date.now() - startTime;
      childLogger?.info(
        { route, phase: "complete", duration, ...data },
        `Request completed: ${route}`,
      );
    },

    /**
     * Call on error
     */
    error(error: unknown, context?: Record<string, unknown>) {
      const duration = Date.now() - startTime;
      const errorContext = {
        route,
        phase: "error",
        duration,
        ...context,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack:
                  process.env.NODE_ENV === "development"
                    ? error.stack
                    : undefined,
              }
            : { error: String(error) },
      };
      childLogger?.error(errorContext, `Request failed: ${route}`);
    },

    /**
     * Log warning
     */
    warn(message: string, data?: Record<string, unknown>) {
      childLogger?.warn({ route, ...data }, message);
    },

    /**
     * Log info
     */
    info(message: string, data?: Record<string, unknown>) {
      childLogger?.info({ route, ...data }, message);
    },

    /**
     * Get the underlying logger for custom logging
     */
    logger: () => childLogger || baseLogger,
  };
}

/**
 * Wrap an async handler with automatic logging
 * Usage:
 *   export const POST = withApiLogging("/api/chat", async (req, logger) => { ... });
 */
export async function withApiLogging<T>(
  route: string,
  handler: (
    request: Request,
    logger: ReturnType<typeof apiRequestLogger>,
  ) => Promise<T>,
  request: Request,
  context?: { userId?: string },
): Promise<T> {
  const apiLog = apiRequestLogger(route);
  apiLog.start(context);

  try {
    const result = await handler(request, apiLog);
    apiLog.success();
    return result;
  } catch (error) {
    apiLog.error(error);
    throw error;
  }
}

/**
 * Log external API calls (OpenRouter, ElevenLabs, Stripe, etc.)
 */
export function logExternalCall(
  service: string,
  context: { operation: string; requestId?: string; userId?: string },
) {
  const requestId = context.requestId || crypto.randomUUID().slice(0, 8);
  const childLogger = baseLogger.child({
    requestId,
    service,
    operation: context.operation,
    ...(context.userId && { userId: context.userId }),
  });

  return {
    start() {
      childLogger.info(
        { phase: "start" },
        `${service} ${context.operation} started`,
      );
    },
    success(data?: Record<string, unknown>) {
      childLogger.info(
        { phase: "complete", ...data },
        `${service} ${context.operation} completed`,
      );
    },
    error(error: unknown, data?: Record<string, unknown>) {
      childLogger.error(
        {
          phase: "error",
          ...data,
          error: error instanceof Error ? error.message : String(error),
        },
        `${service} ${context.operation} failed`,
      );
    },
  };
}

/**
 * Log database queries
 */
export function logDbQuery(
  table: string,
  operation: "select" | "insert" | "update" | "delete",
) {
  return {
    execute(context?: {
      requestId?: string;
      userId?: string;
      recordCount?: number;
    }) {
      const requestId = context?.requestId || crypto.randomUUID().slice(0, 8);
      const childLogger = baseLogger.child({
        requestId,
        ...(context?.userId && { userId: context.userId }),
        table,
        operation,
      });

      // Only log in development to avoid overhead in production
      if (process.env.NODE_ENV === "development") {
        childLogger.debug(
          { recordCount: context?.recordCount },
          `DB ${operation} on ${table}`,
        );
      }
    },
    error(error: unknown, context?: { requestId?: string }) {
      const requestId = context?.requestId || getRequestIdFromHeaders();
      const childLogger = baseLogger.child({
        ...(requestId && { requestId }),
        table,
        operation,
      });
      childLogger.error(
        { error: error instanceof Error ? error.message : String(error) },
        `DB ${operation} failed on ${table}`,
      );
    },
  };
}
