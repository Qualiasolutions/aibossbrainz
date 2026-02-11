import { getSuggestionsByDocumentId } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return new ChatSDKError(
        "bad_request:api",
        "Parameter documentId is required.",
      ).toResponse();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:suggestions").toResponse();
    }

    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    const [suggestion] = suggestions;

    if (!suggestion) {
      return Response.json([], { status: 200 });
    }

    if (suggestion.userId !== user.id) {
      return new ChatSDKError("forbidden:api").toResponse();
    }

    return Response.json(suggestions, { status: 200 });
  } catch (error) {
    console.error("Suggestions API error:", error);
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    return new ChatSDKError(
      "bad_request:api",
      "Failed to get suggestions",
    ).toResponse();
  }
}
