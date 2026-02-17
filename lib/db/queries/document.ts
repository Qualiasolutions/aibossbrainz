import "server-only";

import { logger } from "@/lib/logger";

import {
	type ArtifactKind,
	ChatSDKError,
	createClient,
	type Document,
	dbRetryOptions,
	type Suggestion,
	withRetry,
} from "./shared";

// ============================================
// DOCUMENT QUERIES
// ============================================

export async function saveDocument({
	id,
	title,
	kind,
	content,
	userId,
}: {
	id: string;
	title: string;
	kind: ArtifactKind;
	content: string;
	userId: string;
}) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Document")
			.insert({
				id,
				title,
				kind,
				content,
				userId,
				createdAt: new Date().toISOString(),
			})
			.select();

		if (error) throw error;
		return data;
	} catch (_error) {
		throw new ChatSDKError("bad_request:database", "Failed to save document");
	}
}

export async function getDocumentsById({
	id,
}: {
	id: string;
}): Promise<Document[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Document")
			.select("*")
			.eq("id", id)
			.is("deletedAt", null)
			.order("createdAt", { ascending: true });

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get documents by id",
		);
	}
}

export async function getDocumentById({
	id,
}: {
	id: string;
}): Promise<Document | null> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Document")
			.select("*")
			.eq("id", id)
			.is("deletedAt", null)
			.order("createdAt", { ascending: false })
			.limit(1)
			.single();

		if (error && error.code !== "PGRST116") throw error;
		return data || null;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get document by id",
		);
	}
}

export async function getDocumentsByUserId({
	userId,
}: {
	userId: string;
}): Promise<Document[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Document")
			.select("*")
			.eq("userId", userId)
			.is("deletedAt", null)
			.order("createdAt", { ascending: false });

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get documents by user id",
		);
	}
}

export async function deleteDocumentsByIdAfterTimestamp({
	id,
	timestamp,
}: {
	id: string;
	timestamp: Date;
}) {
	try {
		return await withRetry(async () => {
			const supabase = await createClient();
			const deletedAt = new Date().toISOString();

			// Soft delete suggestions first
			await supabase
				.from("Suggestion")
				.update({ deletedAt })
				.eq("documentId", id)
				.gt("documentCreatedAt", timestamp.toISOString());

			// Soft delete documents
			const { data, error } = await supabase
				.from("Document")
				.update({ deletedAt })
				.eq("id", id)
				.gt("createdAt", timestamp.toISOString())
				.is("deletedAt", null)
				.select();

			if (error) throw error;
			return data;
		}, dbRetryOptions);
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete documents by id after timestamp",
		);
	}
}

// ============================================
// SUGGESTION QUERIES
// ============================================

export async function saveSuggestions({
	suggestions,
}: {
	suggestions: Suggestion[];
}) {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Suggestion")
			.insert(suggestions)
			.select();

		if (error) throw error;
		return data;
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to save suggestions",
		);
	}
}

export async function getSuggestionsByDocumentId({
	documentId,
}: {
	documentId: string;
}): Promise<Suggestion[]> {
	try {
		const supabase = await createClient();
		const { data, error } = await supabase
			.from("Suggestion")
			.select("*")
			.eq("documentId", documentId)
			.is("deletedAt", null);

		if (error) throw error;
		return data || [];
	} catch (_error) {
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get suggestions by document id",
		);
	}
}
