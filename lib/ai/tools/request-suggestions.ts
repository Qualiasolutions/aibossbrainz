import { streamObject, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/artifacts/server";
import { getDocumentById, saveSuggestions } from "@/lib/db/queries";
import { redactPII } from "@/lib/safety/pii-redactor";
import type { Suggestion } from "@/lib/supabase/types";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { myProvider } from "../providers";

type RequestSuggestionsProps = {
	session: Session;
	dataStream: UIMessageStreamWriter<ChatMessage>;
};

type SuggestionDraft = Pick<
	Suggestion,
	| "id"
	| "documentId"
	| "originalText"
	| "suggestedText"
	| "description"
	| "isResolved"
>;

export const requestSuggestions = ({
	session,
	dataStream,
}: RequestSuggestionsProps) =>
	tool({
		description: "Request suggestions for a document",
		inputSchema: z.object({
			documentId: z
				.string()
				.describe("The ID of the document to request edits"),
		}),
		execute: async ({ documentId }) => {
			if (!session.user?.id) {
				return {
					error: "You must be logged in to request suggestions.",
				};
			}

			const userId = session.user.id;
			const document = await getDocumentById({ id: documentId });

			if (!document || !document.content || document.userId !== userId) {
				return {
					error: "Document not found or access denied.",
				};
			}

			const suggestions: SuggestionDraft[] = [];

			const { elementStream } = streamObject({
				model: myProvider.languageModel("artifact-model"),
				system:
					"You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.",
				prompt: document.content,
				output: "array",
				schema: z.object({
					originalSentence: z.string().describe("The original sentence"),
					suggestedSentence: z.string().describe("The suggested sentence"),
					description: z.string().describe("The description of the suggestion"),
				}),
			});

			for await (const element of elementStream) {
				// SAFE-06: Server-side validation with length limits and PII redaction
				const originalText = redactPII(
					(element.originalSentence || "").slice(0, 500),
				).text;
				const suggestedText = redactPII(
					(element.suggestedSentence || "").slice(0, 500),
				).text;
				const description = redactPII(
					(element.description || "").slice(0, 200),
				).text;

				const suggestion: SuggestionDraft = {
					originalText,
					suggestedText,
					description,
					id: generateUUID(),
					documentId,
					isResolved: false,
				};

				dataStream.write({
					type: "data-suggestion",
					// Cast: client only uses display fields (id, originalText, suggestedText, description)
					data: suggestion as Suggestion,
					transient: true,
				});

				suggestions.push(suggestion);
			}

			await saveSuggestions({
				suggestions: suggestions.map((suggestion) => ({
					...suggestion,
					userId,
					createdAt: new Date().toISOString(),
					documentCreatedAt: document.createdAt,
					deletedAt: null,
				})),
			});

			return {
				id: documentId,
				title: document.title,
				kind: document.kind,
				message: "Suggestions have been added to the document",
			};
		},
	});
