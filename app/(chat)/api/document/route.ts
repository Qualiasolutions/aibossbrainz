import { z } from "zod";
import {
	deleteDocumentsByIdAfterTimestamp,
	getDocumentsById,
	saveDocument,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

const documentSchema = z.object({
	content: z.string().max(500000),
	title: z.string().max(500),
	kind: z.enum(["text", "code", "image", "sheet"]),
});

export const maxDuration = 30; // Document operations timeout

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return new ChatSDKError(
				"bad_request:api",
				"Parameter id is missing",
			).toResponse();
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:document").toResponse();
		}

		const documents = await getDocumentsById({ id });

		const [document] = documents;

		if (!document) {
			return new ChatSDKError("not_found:document").toResponse();
		}

		if (document.userId !== user.id) {
			return new ChatSDKError("forbidden:document").toResponse();
		}

		return Response.json(documents, { status: 200 });
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Document GET error");
		return new ChatSDKError(
			"bad_request:document",
			"Failed to fetch document",
		).toResponse();
	}
}

export const POST = withCsrf(async (request: Request) => {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return new ChatSDKError(
				"bad_request:api",
				"Parameter id is required.",
			).toResponse();
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:document").toResponse();
		}

		const body = await request.json();
		const parsed = documentSchema.safeParse(body);
		if (!parsed.success) {
			return Response.json({ error: parsed.error.flatten() }, { status: 400 });
		}

		const { content, title, kind } = parsed.data;

		const documents = await getDocumentsById({ id });

		if (documents.length > 0) {
			const [doc] = documents;

			if (doc.userId !== user.id) {
				return new ChatSDKError("forbidden:document").toResponse();
			}
		}

		const document = await saveDocument({
			id,
			content,
			title,
			kind,
			userId: user.id,
		});

		return Response.json(document, { status: 200 });
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Document POST error");
		return new ChatSDKError(
			"bad_request:document",
			"Failed to save document",
		).toResponse();
	}
});

export const DELETE = withCsrf(async (request: Request) => {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");
		const timestamp = searchParams.get("timestamp");

		if (!id) {
			return new ChatSDKError(
				"bad_request:api",
				"Parameter id is required.",
			).toResponse();
		}

		if (!timestamp) {
			return new ChatSDKError(
				"bad_request:api",
				"Parameter timestamp is required.",
			).toResponse();
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:document").toResponse();
		}

		const documents = await getDocumentsById({ id });

		const [document] = documents;

		if (!document) {
			return new ChatSDKError("not_found:document").toResponse();
		}

		if (document.userId !== user.id) {
			return new ChatSDKError("forbidden:document").toResponse();
		}

		const documentsDeleted = await deleteDocumentsByIdAfterTimestamp({
			id,
			timestamp: new Date(timestamp),
		});

		return Response.json(documentsDeleted, { status: 200 });
	} catch (error) {
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		logger.error({ err: error }, "Document DELETE error");
		return new ChatSDKError(
			"bad_request:document",
			"Failed to delete document",
		).toResponse();
	}
});
