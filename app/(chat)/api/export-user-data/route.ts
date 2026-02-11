import { recordAnalytics } from "@/lib/analytics/queries";
import {
  AuditActions,
  AuditResources,
  logAuditWithRequest,
} from "@/lib/audit/logger";
import { ChatSDKError } from "@/lib/errors";
import {
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/security/rate-limiter";
import { createClient } from "@/lib/supabase/server";

const EXPORT_RATE_LIMIT = 5; // Max 5 exports per day per user
const BATCH_SIZE = 500; // Max IDs per Supabase .in() query

export const maxDuration = 60; // Allow up to 60 seconds for data export

/**
 * GDPR Data Export API
 * Exports all user data in JSON format for GDPR compliance (Right to Data Portability)
 *
 * GET /api/export-user-data
 *
 * Returns a JSON file containing:
 * - User profile
 * - All chats and messages
 * - Documents and suggestions
 * - Reactions and votes
 * - Analytics data
 * - Strategy canvases
 * - Conversation summaries
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError(
        "unauthorized:api",
        "Authentication required",
      ).toResponse();
    }

    // Rate limit: max 5 exports per day
    const rateLimit = await checkRateLimit(
      user.id,
      EXPORT_RATE_LIMIT,
      "export",
    );
    if (!rateLimit.allowed && !rateLimit.requiresDatabaseCheck) {
      return Response.json(
        { error: "Too many export requests. Please try again tomorrow." },
        {
          status: 429,
          headers: getRateLimitHeaders(
            rateLimit.remaining,
            EXPORT_RATE_LIMIT,
            rateLimit.reset,
          ),
        },
      );
    }

    // Fetch all user data in parallel
    const [
      profileResult,
      chatsResult,
      documentsResult,
      reactionsResult,
      analyticsResult,
      canvasesResult,
      summariesResult,
      memoryResult,
    ] = await Promise.all([
      // User profile
      supabase
        .from("User")
        .select("*")
        .eq("id", user.id)
        .single(),

      // All chats (including soft-deleted for complete export)
      supabase
        .from("Chat")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(5000),

      // All documents
      supabase
        .from("Document")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(5000),

      // All reactions
      supabase
        .from("MessageReaction")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(10000),

      // Analytics data
      supabase
        .from("UserAnalytics")
        .select("*")
        .eq("userId", user.id)
        .order("date", { ascending: false })
        .limit(2000),

      // Strategy canvases
      supabase
        .from("StrategyCanvas")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(1000),

      // Conversation summaries
      supabase
        .from("ConversationSummary")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false })
        .limit(5000),

      // Executive memory
      supabase
        .from("ExecutiveMemory")
        .select("*")
        .eq("userId", user.id)
        .limit(100),
    ]);

    // Fetch messages and votes for user's chats (batched to avoid query size limits)
    const chatIds = chatsResult.data?.map((c) => c.id) || [];
    let messagesData: unknown[] = [];
    let votesData: unknown[] = [];

    if (chatIds.length > 0) {
      // Batch chatIds into chunks to avoid Supabase .in() limits
      const chunks: string[][] = [];
      for (let i = 0; i < chatIds.length; i += BATCH_SIZE) {
        chunks.push(chatIds.slice(i, i + BATCH_SIZE));
      }

      const [messagesResults, votesResults] = await Promise.all([
        Promise.all(
          chunks.map((chunk) =>
            supabase
              .from("Message_v2")
              .select("*")
              .in("chatId", chunk)
              .order("createdAt", { ascending: true })
              .limit(50000),
          ),
        ),
        Promise.all(
          chunks.map((chunk) =>
            supabase
              .from("Vote_v2")
              .select("*")
              .in("chatId", chunk)
              .limit(10000),
          ),
        ),
      ]);

      messagesData = messagesResults.flatMap((r) => r.data || []);
      votesData = votesResults.flatMap((r) => r.data || []);
    }

    // Compile export data
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        format: "JSON",
        version: "1.0",
        gdprCompliant: true,
      },
      profile: profileResult.data,
      chats: chatsResult.data || [],
      messages: messagesData,
      documents: documentsResult.data || [],
      reactions: reactionsResult.data || [],
      votes: votesData,
      analytics: analyticsResult.data || [],
      strategyCanvases: canvasesResult.data || [],
      conversationSummaries: summariesResult.data || [],
      executiveMemory: memoryResult.data || [],
      _metadata: {
        totalChats: chatsResult.data?.length || 0,
        totalMessages: messagesData.length,
        totalDocuments: documentsResult.data?.length || 0,
        totalReactions: reactionsResult.data?.length || 0,
        totalVotes: votesData.length,
      },
    };

    // Log the export for audit trail
    await logAuditWithRequest(request, {
      userId: user.id,
      action: AuditActions.DATA_EXPORT,
      resource: AuditResources.DATA,
      resourceId: user.id,
      details: {
        totalChats: exportData._metadata.totalChats,
        totalMessages: exportData._metadata.totalMessages,
        totalDocuments: exportData._metadata.totalDocuments,
      },
    });

    // Record export analytics
    await recordAnalytics(user.id, "export", 1);

    // Return as downloadable JSON
    const filename = `user-data-export-${user.id.slice(0, 8)}-${Date.now()}.json`;

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GDPR Export] Error exporting user data:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      "bad_request:api",
      "Failed to export user data. Please try again.",
    ).toResponse();
  }
}
