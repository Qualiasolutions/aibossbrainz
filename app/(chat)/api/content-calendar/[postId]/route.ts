import { deleteContentCalendarPost } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ postId: string }> },
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		const { postId } = await params;

		if (!UUID_REGEX.test(postId)) {
			return new ChatSDKError("bad_request:api").toResponse();
		}

		await deleteContentCalendarPost({
			postId,
			userId: user.id,
		});

		return Response.json({ success: true });
	} catch (error) {
		logger.error({ err: error }, "Content calendar API DELETE error");
		return new ChatSDKError("bad_request:database").toResponse();
	}
}
