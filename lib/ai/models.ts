export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
	id: string;
	name: string;
	description: string;
};

export const chatModels: ChatModel[] = [
	{
		id: "chat-model",
		name: "Gemini 2.5 Flash",
		description: "High-performance AI model via OpenRouter (stable)",
	},
];
