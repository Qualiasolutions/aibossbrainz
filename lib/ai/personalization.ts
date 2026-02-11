import type {
  BusinessModelData,
  JourneyTouchpoint,
  StickyNote,
  SwotData,
} from "@/components/strategy-canvas/types";
import {
  getExecutiveMemory,
  getRecentConversationSummaries,
  getStrategyCanvas,
  getUserProfile,
} from "@/lib/db/queries";

interface PersonalizationContext {
  userContext: string;
  canvasContext: string;
  memoryContext: string;
}

/**
 * Formats SWOT data into concise text for context injection
 */
function formatSwotForContext(data: SwotData): string {
  const sections = [];

  if (data.strengths?.length) {
    const items = data.strengths
      .map((n) => n.content)
      .filter(Boolean)
      .slice(0, 5);
    if (items.length) sections.push(`Strengths: ${items.join(", ")}`);
  }
  if (data.weaknesses?.length) {
    const items = data.weaknesses
      .map((n) => n.content)
      .filter(Boolean)
      .slice(0, 5);
    if (items.length) sections.push(`Weaknesses: ${items.join(", ")}`);
  }
  if (data.opportunities?.length) {
    const items = data.opportunities
      .map((n) => n.content)
      .filter(Boolean)
      .slice(0, 5);
    if (items.length) sections.push(`Opportunities: ${items.join(", ")}`);
  }
  if (data.threats?.length) {
    const items = data.threats
      .map((n) => n.content)
      .filter(Boolean)
      .slice(0, 5);
    if (items.length) sections.push(`Threats: ${items.join(", ")}`);
  }

  return sections.length ? `SWOT Analysis:\n${sections.join("\n")}` : "";
}

/**
 * Formats BMC data into concise text for context injection
 */
function formatBmcForContext(data: BusinessModelData): string {
  const sections: string[] = [];

  const formatSection = (key: keyof BusinessModelData, label: string) => {
    const items = data[key]
      ?.map((n) => n.content)
      .filter(Boolean)
      .slice(0, 4);
    if (items?.length) sections.push(`${label}: ${items.join(", ")}`);
  };

  formatSection("valuePropositions", "Value Props");
  formatSection("customerSegments", "Customers");
  formatSection("channels", "Channels");
  formatSection("revenueStreams", "Revenue");
  formatSection("keyActivities", "Key Activities");
  formatSection("keyResources", "Key Resources");
  formatSection("keyPartners", "Partners");
  formatSection("costStructure", "Costs");

  return sections.length ? `Business Model:\n${sections.join("\n")}` : "";
}

/**
 * Formats Journey data into concise text
 */
function formatJourneyForContext(touchpoints: JourneyTouchpoint[]): string {
  if (!touchpoints?.length) return "";

  const stages = [
    "awareness",
    "consideration",
    "decision",
    "purchase",
    "retention",
    "advocacy",
  ] as const;
  const stageContent = stages
    .map((stage) => {
      const items = touchpoints.filter((t) => t.stage === stage);
      if (!items.length) return null;
      return `${stage}: ${items
        .slice(0, 3)
        .map(
          (t) => `${t.content}${t.type !== "touchpoint" ? ` (${t.type})` : ""}`,
        )
        .join("; ")}`;
    })
    .filter(Boolean);

  return stageContent.length
    ? `Customer Journey:\n${stageContent.join("\n")}`
    : "";
}

/**
 * Formats Brainstorm data into concise text
 */
function formatBrainstormForContext(notes: StickyNote[]): string {
  if (!notes?.length) return "";

  const byCategory = notes.reduce(
    (acc, note) => {
      const cat = note.category || "Ideas";
      if (!acc[cat]) acc[cat] = [];
      if (note.content) acc[cat].push(note.content);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  const sections = Object.entries(byCategory)
    .filter(([_, items]) => items.length)
    .map(([cat, items]) => `${cat}: ${items.slice(0, 4).join(", ")}`);

  return sections.length ? `Brainstorm Notes:\n${sections.join("\n")}` : "";
}

/**
 * Builds personalization context for system prompt injection
 */
export async function buildPersonalizationContext(
  userId: string,
): Promise<PersonalizationContext> {
  try {
    // Parallel fetch all personalization data
    const [profile, swot, bmc, journey, brainstorm, memories, recentSummaries] =
      await Promise.all([
        getUserProfile({ userId }).catch(() => null),
        getStrategyCanvas({ userId, canvasType: "swot" }).catch(() => null),
        getStrategyCanvas({ userId, canvasType: "bmc" }).catch(() => null),
        getStrategyCanvas({ userId, canvasType: "journey" }).catch(() => null),
        getStrategyCanvas({ userId, canvasType: "brainstorm" }).catch(
          () => null,
        ),
        getExecutiveMemory({ userId }).catch(() => []),
        getRecentConversationSummaries({ userId, limit: 3 }).catch(() => []),
      ]);

    // Build user context
    let userContext = "";
    if (profile) {
      const parts = [];
      if (profile.displayName)
        parts.push(`User's name is ${profile.displayName}`);
      if (profile.companyName) parts.push(`Company: ${profile.companyName}`);
      if (profile.industry) parts.push(`Industry: ${profile.industry}`);
      if (profile.businessGoals) parts.push(`Goals: ${profile.businessGoals}`);
      if (profile.productsServices)
        parts.push(`Products/Services: ${profile.productsServices}`);
      if (profile.websiteUrl) parts.push(`Website: ${profile.websiteUrl}`);
      if (profile.targetMarket)
        parts.push(`Target Market: ${profile.targetMarket}`);
      if (profile.competitors)
        parts.push(`Competitors: ${profile.competitors}`);
      if (profile.annualRevenue)
        parts.push(`Annual Revenue: ${profile.annualRevenue}`);
      if (profile.yearsInBusiness)
        parts.push(`Years in Business: ${profile.yearsInBusiness}`);
      if (profile.employeeCount)
        parts.push(`Team Size: ${profile.employeeCount}`);
      userContext = parts.length ? `${parts.join(". ")}.` : "";
    }

    // Build canvas context
    const canvasSections: string[] = [];
    if (swot?.data)
      canvasSections.push(
        formatSwotForContext(swot.data as unknown as SwotData),
      );
    if (bmc?.data)
      canvasSections.push(
        formatBmcForContext(bmc.data as unknown as BusinessModelData),
      );
    if (journey?.data) {
      const journeyData = journey.data as { touchpoints?: JourneyTouchpoint[] };
      if (journeyData.touchpoints) {
        canvasSections.push(formatJourneyForContext(journeyData.touchpoints));
      }
    }
    if (brainstorm?.data) {
      const brainstormData = brainstorm.data as { notes?: StickyNote[] };
      if (brainstormData.notes) {
        canvasSections.push(formatBrainstormForContext(brainstormData.notes));
      }
    }
    const canvasContext = canvasSections.filter(Boolean).join("\n\n");

    // Build memory context from conversation summaries
    let memoryContext = "";
    if (recentSummaries.length) {
      memoryContext =
        "Recent conversation context:\n" +
        recentSummaries.map((s) => `- ${s.summary}`).join("\n");
    }

    // Add executive preference info if available
    if (memories.length > 0) {
      const preferred = memories[0];
      const topTopics = (preferred.topTopics as string[]) || [];
      if (topTopics.length > 0) {
        memoryContext += memoryContext ? "\n\n" : "";
        memoryContext += `User frequently discusses: ${topTopics.slice(0, 5).join(", ")}`;
      }
    }

    return { userContext, canvasContext, memoryContext };
  } catch (error) {
    console.warn("[Personalization] Failed to build context:", error);
    return { userContext: "", canvasContext: "", memoryContext: "" };
  }
}

/**
 * Formats full personalization context for system prompt
 */
export function formatPersonalizationPrompt(
  context: PersonalizationContext,
): string {
  const sections: string[] = [];

  if (context.userContext) {
    sections.push(`## USER PROFILE\n${context.userContext}`);
  }

  if (context.canvasContext) {
    sections.push(
      `## USER'S STRATEGIC CONTEXT\nThe user has created the following strategic analyses. Reference these when relevant to their questions:\n\n${context.canvasContext}`,
    );
  }

  if (context.memoryContext) {
    sections.push(`## PREVIOUS CONVERSATIONS\n${context.memoryContext}`);
  }

  if (!sections.length) return "";

  return `\n\n---PERSONALIZATION CONTEXT---\nUse this information to personalize your responses:\n\n${sections.join("\n\n")}\n\n**IMPORTANT:** Address the user by name when appropriate. Reference their strategic context when relevant to their questions.\n---END PERSONALIZATION---`;
}
