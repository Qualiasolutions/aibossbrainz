import * as Sentry from "@sentry/nextjs";

type BreadcrumbCategory =
	| "chat"
	| "auth"
	| "voice"
	| "document"
	| "navigation"
	| "user-action";

type SeverityLevel = "info" | "warning" | "error";

function addBreadcrumb(
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
