import type { NextRequest } from "next/server";
import { deleteAllChatsByUserId, getChatsByUserId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const startingAfter = searchParams.get("starting_after");
    const endingBefore = searchParams.get("ending_before");

    if (startingAfter && endingBefore) {
      return new ChatSDKError(
        "bad_request:api",
        "Only one of starting_after or ending_before can be provided.",
      ).toResponse();
    }

    // Validate limit range
    if (limit < 1 || limit > 100) {
      return new ChatSDKError(
        "bad_request:api",
        "Limit must be between 1 and 100",
      ).toResponse();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // More explicit session validation
    if (!user?.id) {
      console.warn(
        "[API /history] Unauthorized access attempt - no user session",
      );
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const chats = await getChatsByUserId({
      id: user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(chats);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Better error logging with context
    const errorDetails = {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    console.error("[API /history] GET error:", errorDetails);

    return new ChatSDKError(
      "bad_request:api",
      "Failed to fetch chat history",
    ).toResponse();
  }
}

export const DELETE = withCsrf(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const result = await deleteAllChatsByUserId({ userId: user.id });

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("History DELETE error:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to delete chat history",
    ).toResponse();
  }
});
