import { NextResponse } from "next/server";
import { isUserAdmin } from "@/lib/admin/queries";
import { clearKnowledgeBaseCache } from "@/lib/ai/knowledge-base";
import { env } from "@/lib/env";
import { withCsrf } from "@/lib/security/with-csrf";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FIREFLIES_GRAPHQL_URL = "https://api.fireflies.ai/graphql";

const TRANSCRIPT_QUERY = `
  query($id: String!) {
    transcript(id: $id) {
      title
      date
      duration
      sentences {
        text
        speaker_name
      }
      summary {
        overview
        action_items
        topics_discussed
      }
      speakers {
        name
      }
    }
  }
`;

interface FirefliesSentence {
  text: string;
  speaker_name: string;
}

interface FirefliesSpeaker {
  name: string;
}

interface FirefliesTranscript {
  title: string;
  date: string;
  duration: number;
  sentences: FirefliesSentence[];
  summary: {
    overview: string;
    action_items: string;
    topics_discussed: string;
  } | null;
  speakers: FirefliesSpeaker[];
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${remaining}min`;
}

function transformToMarkdown(transcript: FirefliesTranscript): string {
  const date = transcript.date
    ? new Date(transcript.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown date";

  const attendees = transcript.speakers?.length
    ? transcript.speakers.map((s) => s.name).join(", ")
    : "Unknown";

  const duration = transcript.duration
    ? formatDuration(transcript.duration)
    : "Unknown";

  let markdown = `# Meeting: ${transcript.title}\n`;
  markdown += `**Date:** ${date} | **Duration:** ${duration}\n`;
  markdown += `**Attendees:** ${attendees}\n`;

  if (transcript.summary) {
    if (transcript.summary.overview) {
      markdown += `\n## Summary\n${transcript.summary.overview}\n`;
    }
    if (transcript.summary.topics_discussed) {
      markdown += `\n## Key Topics\n${transcript.summary.topics_discussed}\n`;
    }
    if (transcript.summary.action_items) {
      markdown += `\n## Action Items\n${transcript.summary.action_items}\n`;
    }
  }

  if (transcript.sentences?.length) {
    markdown += "\n## Full Transcript\n";
    for (const sentence of transcript.sentences) {
      markdown += `**${sentence.speaker_name}:** ${sentence.text}\n`;
    }
  }

  return markdown;
}

export const POST = withCsrf(async (request: Request) => {
  // Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin access
  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate request body
  let body: { transcriptId: string; botType: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { transcriptId, botType } = body;

  if (!transcriptId || typeof transcriptId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid transcriptId" },
      { status: 400 },
    );
  }

  if (!botType || !["alexandria", "kim", "shared"].includes(botType)) {
    return NextResponse.json(
      {
        error:
          "Invalid botType. Must be one of: alexandria, kim, shared",
      },
      { status: 400 },
    );
  }

  // Validate Fireflies API key
  const apiKey = env.FIREFLIES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FIREFLIES_API_KEY environment variable is not configured" },
      { status: 500 },
    );
  }

  // Fetch transcript from Fireflies
  let transcript: FirefliesTranscript;
  try {
    const response = await fetch(FIREFLIES_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: TRANSCRIPT_QUERY,
        variables: { id: transcriptId },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        "[Fireflies] API error:",
        response.status,
        text,
      );
      return NextResponse.json(
        {
          error: `Fireflies API returned ${response.status}`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    if (data.errors) {
      console.error("[Fireflies] GraphQL errors:", data.errors);
      return NextResponse.json(
        {
          error: `Fireflies API error: ${data.errors[0]?.message || "Unknown error"}`,
        },
        { status: 502 },
      );
    }

    if (!data.data?.transcript) {
      return NextResponse.json(
        { error: "Transcript not found in Fireflies" },
        { status: 404 },
      );
    }

    transcript = data.data.transcript;
  } catch (err) {
    console.error("[Fireflies] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to connect to Fireflies API" },
      { status: 502 },
    );
  }

  // Transform to markdown
  const markdownContent = transformToMarkdown(transcript);

  // Store in Supabase
  const serviceClient = createServiceClient();

  const metadata = {
    duration: transcript.duration,
    speakers: transcript.speakers?.map((s) => s.name) || [],
    date: transcript.date,
    hasSummary: !!transcript.summary,
    sentenceCount: transcript.sentences?.length || 0,
  };

  const { data: inserted, error: insertError } = await serviceClient
    .from("knowledge_base_content")
    .insert({
      title: transcript.title || `Fireflies Transcript ${transcriptId}`,
      source: "fireflies",
      source_id: transcriptId,
      bot_type: botType,
      content: markdownContent,
      metadata,
    })
    .select("id, title")
    .single();

  if (insertError) {
    // Check for unique constraint violation (duplicate ingestion)
    if (
      insertError.code === "23505" ||
      insertError.message?.includes("unique") ||
      insertError.message?.includes("duplicate")
    ) {
      return NextResponse.json(
        { error: "Transcript already ingested" },
        { status: 409 },
      );
    }

    console.error("[Knowledge Base] Insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to store transcript" },
      { status: 500 },
    );
  }

  // Clear knowledge base cache so new content is immediately available
  clearKnowledgeBaseCache();

  return NextResponse.json({
    success: true,
    title: inserted.title,
    id: inserted.id,
  });
});
