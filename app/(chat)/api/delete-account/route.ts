import { createAuditLog } from "@/lib/db/queries";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient } from "@/lib/supabase/server";

export const POST = withCsrf(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const deletedAt = new Date().toISOString();
    const userId = user.id;

    // Log the deletion attempt
    await createAuditLog({
      userId,
      action: "account_deletion_requested",
      resource: "User",
      resourceId: userId,
      details: { email: user.email },
    });

    // 1. Soft delete all user's chats and related data
    const { data: userChats } = await supabase
      .from("Chat")
      .select("id")
      .eq("userId", userId)
      .is("deletedAt", null);

    if (userChats && userChats.length > 0) {
      const chatIds = userChats.map((c) => c.id);

      // Soft delete chat-related data
      await Promise.all([
        supabase.from("Vote_v2").update({ deletedAt }).in("chatId", chatIds),
        supabase.from("Message_v2").update({ deletedAt }).in("chatId", chatIds),
        supabase.from("Stream").update({ deletedAt }).in("chatId", chatIds),
      ]);

      // Soft delete chats
      await supabase
        .from("Chat")
        .update({ deletedAt })
        .eq("userId", userId)
        .is("deletedAt", null);
    }

    // 2. Soft delete user's documents and suggestions
    const { data: userDocs } = await supabase
      .from("Document")
      .select("id")
      .eq("userId", userId)
      .is("deletedAt", null);

    if (userDocs && userDocs.length > 0) {
      const docIds = userDocs.map((d) => d.id);
      await supabase
        .from("Suggestion")
        .update({ deletedAt })
        .in("documentId", docIds);
      await supabase
        .from("Document")
        .update({ deletedAt })
        .eq("userId", userId)
        .is("deletedAt", null);
    }

    // 3. Soft delete user's strategy canvases
    await supabase
      .from("StrategyCanvas")
      .update({ deletedAt })
      .eq("userId", userId)
      .is("deletedAt", null);

    // 4. Soft delete user's conversation summaries
    await supabase
      .from("ConversationSummary")
      .update({ deletedAt })
      .eq("userId", userId)
      .is("deletedAt", null);

    // 5. Soft delete user's executive memory
    await supabase.from("ExecutiveMemory").delete().eq("userId", userId);

    // 6. Soft delete user's analytics
    await supabase.from("UserAnalytics").delete().eq("userId", userId);

    // 7. Soft delete user's message reactions
    await supabase.from("MessageReaction").delete().eq("userId", userId);

    // 8. Soft delete the user record itself
    const { error: userError } = await supabase
      .from("User")
      .update({ deletedAt })
      .eq("id", userId);

    if (userError) {
      throw userError;
    }

    // Log successful deletion
    await createAuditLog({
      userId,
      action: "account_deleted",
      resource: "User",
      resourceId: userId,
      details: { email: user.email, deletedAt },
    });

    // 9. Sign out the user
    await supabase.auth.signOut();

    return Response.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete account:", error);
    return new Response("Failed to delete account", { status: 500 });
  }
});
