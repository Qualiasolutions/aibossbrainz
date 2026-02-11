import { safeParseJson } from "@/lib/api-utils";
import {
  addMessageReaction,
  getMessageReactionCounts,
  getUserReactionForMessage,
  getUserReactionsByType,
  removeMessageReaction,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";
import type { ReactionType } from "@/lib/supabase/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");
  const reactionType = searchParams.get("type") as ReactionType | null;

  // If reactionType is provided, return all reactions of that type for the user
  if (reactionType) {
    const validTypes = [
      "actionable",
      "needs_clarification",
      "ready_to_implement",
      "save_for_later",
    ];
    if (!validTypes.includes(reactionType)) {
      return new Response("Invalid reaction type", { status: 400 });
    }

    try {
      const items = await getUserReactionsByType({
        userId: user.id,
        reactionType,
      });
      return Response.json({ items });
    } catch (error) {
      console.error("Failed to get reactions by type:", error);
      return new Response("Failed to get reactions", { status: 500 });
    }
  }

  // Otherwise, get reactions for a specific message
  if (!messageId) {
    return new Response("Missing messageId or type", { status: 400 });
  }

  try {
    const [userReactions, reactionCounts] = await Promise.all([
      getUserReactionForMessage({
        messageId,
        userId: user.id,
      }),
      getMessageReactionCounts({ messageId }),
    ]);

    return Response.json({
      // Return array of active reaction types for multi-select support
      userReactions: userReactions.map((r) => r.reactionType),
      // Keep legacy field for backward compatibility
      userReaction: userReactions[0]?.reactionType ?? null,
      reactionCounts,
    });
  } catch (error) {
    console.error("Failed to get reactions:", error);
    return new Response("Failed to get reactions", { status: 500 });
  }
}

export const POST = withCsrf(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const { messageId, reactionType } = await safeParseJson<{
      messageId: string;
      reactionType: string;
    }>(request);

    if (!messageId || !reactionType) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing messageId or reactionType",
      ).toResponse();
    }

    // Validate reaction type
    const validTypes = [
      "actionable",
      "needs_clarification",
      "ready_to_implement",
      "save_for_later",
    ];
    if (!validTypes.includes(reactionType)) {
      return new ChatSDKError(
        "bad_request:api",
        "Invalid reaction type",
      ).toResponse();
    }

    // Toggle logic: check if user already has this specific reaction type
    const existingReactions = await getUserReactionForMessage({
      messageId,
      userId: user.id,
    });
    const alreadyHasReaction = existingReactions.some(
      (r) => r.reactionType === reactionType,
    );

    if (alreadyHasReaction) {
      // Toggle OFF: remove only this specific reaction type
      await removeMessageReaction({
        messageId,
        userId: user.id,
        reactionType: reactionType as ReactionType,
      });
      return Response.json({ success: true, action: "removed" });
    }

    // Toggle ON: add the reaction (other reactions remain)
    await addMessageReaction({
      messageId,
      userId: user.id,
      reactionType: reactionType as ReactionType,
    });

    return Response.json({ success: true, action: "added" });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to add reaction:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to add reaction",
    ).toResponse();
  }
});

export const DELETE = withCsrf(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return new ChatSDKError("unauthorized:api").toResponse();
  }

  try {
    const { messageId, reactionType } = await safeParseJson<{
      messageId: string;
      reactionType?: string;
    }>(request);

    if (!messageId) {
      return new ChatSDKError(
        "bad_request:api",
        "Missing messageId",
      ).toResponse();
    }

    await removeMessageReaction({
      messageId,
      userId: user.id,
      reactionType: reactionType as ReactionType | undefined,
    });

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    console.error("Failed to remove reaction:", error);
    return new ChatSDKError(
      "bad_request:api",
      "Failed to remove reaction",
    ).toResponse();
  }
});
