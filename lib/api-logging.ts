/**
 * Centralized API logging utilities
 * Provides request-scoped logging with request IDs and user context
 */

import { type Logger, logger as baseLogger } from "./logger";

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
