/**
 * Lightweight structured logger that works in all runtimes
 * (Node.js, Edge, and sandbox environments).
 *
 * Avoids pino worker threads (thread-stream) which crash in
 * restricted environments like v0 sandboxes.
 */

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

const isDevelopment = process.env.NODE_ENV === "development";
const currentLevel: LogLevel =
	(process.env.LOG_LEVEL as LogLevel) || (isDevelopment ? "debug" : "info");
const currentLevelValue = LOG_LEVELS[currentLevel] ?? 30;

function shouldLog(level: LogLevel): boolean {
	return (LOG_LEVELS[level] ?? 30) >= currentLevelValue;
}

interface LoggerInstance {
	trace: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	debug: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	info: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	warn: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	error: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	fatal: (msg: string | Record<string, unknown>, ...args: unknown[]) => void;
	child: (bindings: Record<string, unknown>) => LoggerInstance;
}

function createLogger(
	bindings: Record<string, unknown> = {},
): LoggerInstance {
	const log = (level: LogLevel, msg: string | Record<string, unknown>, ...args: unknown[]) => {
		if (!shouldLog(level)) return;
		const timestamp = new Date().toISOString();
		const entry = {
			level,
			time: timestamp,
			...bindings,
			...(typeof msg === "object" ? msg : { msg }),
		};
		const consoleFn =
			level === "error" || level === "fatal"
				? console.error
				: level === "warn"
					? console.warn
					: level === "debug" || level === "trace"
						? console.debug
						: console.log;
		if (isDevelopment) {
			consoleFn(`[${timestamp.slice(11, 19)}] ${level.toUpperCase()} ${typeof msg === "string" ? msg : JSON.stringify(msg)}`, ...args);
		} else {
			consoleFn(JSON.stringify(entry), ...args);
		}
	};

	return {
		trace: (msg, ...args) => log("trace", msg, ...args),
		debug: (msg, ...args) => log("debug", msg, ...args),
		info: (msg, ...args) => log("info", msg, ...args),
		warn: (msg, ...args) => log("warn", msg, ...args),
		error: (msg, ...args) => log("error", msg, ...args),
		fatal: (msg, ...args) => log("fatal", msg, ...args),
		child: (childBindings) =>
			createLogger({ ...bindings, ...childBindings }),
	};
}

export const logger = createLogger();

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
	return logger.child({
		requestId,
		...(userId && { userId }),
	});
}

// Export a compatible Logger type
export type Logger = LoggerInstance;
