import { z } from "zod";
import {
	getChatById,
	getMessagesByChatIdPaginated,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const paginationSchema = z.object({
	chatId: z.string().uuid(),
	before: z.string().datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: Request) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { searchParams } = new URL(request.url);
		const parsed = paginationSchema.safeParse({
			chatId: searchParams.get("chatId"),
			before: searchParams.get("before") || undefined,
			limit: searchParams.get("limit") || undefined,
		});

		if (!parsed.success) {
			logger.warn(
				{ errors: parsed.error.flatten() },
				"Message pagination validation failed",
			);
			return new ChatSDKError("bad_request:api").toResponse();
		}

		const { chatId, before, limit } = parsed.data;

		// Verify ownership
		const chat = await getChatById({ id: chatId });
		if (!chat || chat.userId !== user.id) {
			return new ChatSDKError("not_found:chat").toResponse();
		}

		const messages = await getMessagesByChatIdPaginated({
			id: chatId,
			limit,
			before,
		});

		return Response.json({
			messages,
			hasMore: messages.length === limit,
		});
	} catch (error) {
		if (error instanceof ChatSDKError) return error.toResponse();
		logger.error({ err: error }, "Message pagination error");
		return new ChatSDKError("bad_request:database").toResponse();
	}
}
