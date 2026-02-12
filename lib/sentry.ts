import * as Sentry from "@sentry/nextjs";

type BreadcrumbCategory =
	| "chat"
	| "auth"
	| "voice"
	| "document"
	| "navigation"
	| "user-action";

type SeverityLevel = "info" | "warning" | "error";

export function addBreadcrumb(
	category: BreadcrumbCategory,
	message: string,
	data?: Record<string, unknown>,
	level: SeverityLevel = "info",
) {
	if (process.env.NODE_ENV !== "production") return;

	Sentry.addBreadcrumb({
		category,
		message,
		level,
		data,
	});
}

export const chatBreadcrumb = {
	messageSent: (chatId: string, botType: string) => {
		addBreadcrumb("chat", "Message sent", { chatId, botType });
	},
	messageReceived: (chatId: string, botType: string) => {
		addBreadcrumb("chat", "Message received", { chatId, botType });
	},
	chatCreated: (chatId: string) => {
		addBreadcrumb("chat", "Chat created", { chatId });
	},
	chatDeleted: (chatId: string) => {
		addBreadcrumb("chat", "Chat deleted", { chatId });
	},
	executiveSwitched: (from: string, to: string) => {
		addBreadcrumb("chat", "Executive switched", { from, to });
	},
	focusModeChanged: (mode: string) => {
		addBreadcrumb("chat", "Focus mode changed", { mode });
	},
};

export const authBreadcrumb = {
	loginAttempt: () => {
		addBreadcrumb("auth", "Login attempt");
	},
	loginSuccess: () => {
		addBreadcrumb("auth", "Login successful");
	},
	loginFailed: (reason: string) => {
		addBreadcrumb("auth", "Login failed", { reason }, "warning");
	},
	logout: () => {
		addBreadcrumb("auth", "User logged out");
	},
	sessionExpired: () => {
		addBreadcrumb("auth", "Session expired", undefined, "warning");
	},
};

export const voiceBreadcrumb = {
	ttsRequested: (botType: string) => {
		addBreadcrumb("voice", "TTS requested", { botType });
	},
	ttsPlaying: () => {
		addBreadcrumb("voice", "TTS started playing");
	},
	ttsStopped: () => {
		addBreadcrumb("voice", "TTS stopped");
	},
	sttStarted: () => {
		addBreadcrumb("voice", "STT started");
	},
	sttResult: (textLength: number) => {
		addBreadcrumb("voice", "STT result received", { textLength });
	},
};

export const documentBreadcrumb = {
	created: (kind: string, documentId: string) => {
		addBreadcrumb("document", "Document created", { kind, documentId });
	},
	updated: (documentId: string) => {
		addBreadcrumb("document", "Document updated", { documentId });
	},
	exported: (format: string) => {
		addBreadcrumb("document", "Document exported", { format });
	},
	canvasOpened: (type: string) => {
		addBreadcrumb("document", "Canvas opened", { type });
	},
};

export const userActionBreadcrumb = {
	reaction: (type: string, messageId: string) => {
		addBreadcrumb("user-action", "Reaction added", { type, messageId });
	},
	copy: () => {
		addBreadcrumb("user-action", "Content copied");
	},
	settingsChanged: (setting: string) => {
		addBreadcrumb("user-action", "Settings changed", { setting });
	},
};

export function setUserContext(userId: string, email?: string) {
	if (process.env.NODE_ENV !== "production") return;

	Sentry.setUser({
		id: userId,
		email: email?.includes("@") ? email : undefined, // Only log valid emails
	});
}

export function clearUserContext() {
	if (process.env.NODE_ENV !== "production") return;

	Sentry.setUser(null);
}
