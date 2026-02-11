import pino from "pino";

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * Structured logger using pino
 * - JSON format in production for log aggregation
 * - Pretty format in development for readability
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : {
        // Production: JSON format for log aggregation
        formatters: {
          level: (label) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    ...(userId && { userId }),
  });
}

/**
 * Log levels:
 * - trace: Very detailed debugging
 * - debug: Development debugging
 * - info: Normal operation events
 * - warn: Recoverable issues
 * - error: Errors requiring attention
 * - fatal: Application crash
 */

// Re-export pino types for convenience
export type { Logger } from "pino";
