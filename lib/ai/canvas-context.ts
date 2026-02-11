import type { Json } from "@/lib/supabase/types";

interface StickyNote {
  id: string;
  content: string;
  color?: string;
  category?: string;
}

interface SwotData {
  strengths: StickyNote[];
  weaknesses: StickyNote[];
  opportunities: StickyNote[];
  threats: StickyNote[];
}

interface BusinessModelData {
  keyPartners: StickyNote[];
  keyActivities: StickyNote[];
  keyResources: StickyNote[];
  valuePropositions: StickyNote[];
  customerRelationships: StickyNote[];
  channels: StickyNote[];
  customerSegments: StickyNote[];
  costStructure: StickyNote[];
  revenueStreams: StickyNote[];
}

interface JourneyTouchpoint {
  id: string;
  stage: string;
  content: string;
  type: "touchpoint" | "pain" | "opportunity";
}

interface JourneyData {
  touchpoints: JourneyTouchpoint[];
}

interface BrainstormData {
  notes: StickyNote[];
}

interface CanvasItem {
  canvasType: "swot" | "bmc" | "journey" | "brainstorm";
  data: Json;
}

function formatNotes(notes: StickyNote[]): string {
  const validNotes = notes.filter((n) => n.content?.trim());
  if (validNotes.length === 0) return "(none yet)";
  return validNotes.map((n) => `- ${n.content}`).join("\n");
}

function formatSwot(data: SwotData): string {
  const sections = [
    { label: "Strengths", items: data.strengths },
    { label: "Weaknesses", items: data.weaknesses },
    { label: "Opportunities", items: data.opportunities },
    { label: "Threats", items: data.threats },
  ];

  const hasContent = sections.some((s) =>
    s.items.some((n) => n.content?.trim()),
  );
  if (!hasContent) return "";

  return sections
    .map((s) => `**${s.label}:**\n${formatNotes(s.items)}`)
    .join("\n\n");
}

function formatBmc(data: BusinessModelData): string {
  const sections = [
    { label: "Key Partners", items: data.keyPartners },
    { label: "Key Activities", items: data.keyActivities },
    { label: "Key Resources", items: data.keyResources },
    { label: "Value Propositions", items: data.valuePropositions },
    { label: "Customer Relationships", items: data.customerRelationships },
    { label: "Channels", items: data.channels },
    { label: "Customer Segments", items: data.customerSegments },
    { label: "Cost Structure", items: data.costStructure },
    { label: "Revenue Streams", items: data.revenueStreams },
  ];

  const hasContent = sections.some((s) =>
    s.items.some((n) => n.content?.trim()),
  );
  if (!hasContent) return "";

  return sections
    .filter((s) => s.items.some((n) => n.content?.trim()))
    .map((s) => `**${s.label}:**\n${formatNotes(s.items)}`)
    .join("\n\n");
}

function formatJourney(data: JourneyData): string {
  const touchpoints = data.touchpoints || [];
  if (touchpoints.length === 0) return "";

  const stages = [
    "awareness",
    "consideration",
    "decision",
    "purchase",
    "retention",
    "advocacy",
  ];
  const stageLabels: Record<string, string> = {
    awareness: "Awareness",
    consideration: "Consideration",
    decision: "Decision",
    purchase: "Purchase",
    retention: "Retention",
    advocacy: "Advocacy",
  };

  const byStage = stages
    .map((stage) => {
      const items = touchpoints.filter((tp) => tp.stage === stage);
      if (items.length === 0) return null;

      const formatted = items
        .map((tp) => {
          const prefix =
            tp.type === "pain"
              ? "[Pain Point]"
              : tp.type === "opportunity"
                ? "[Opportunity]"
                : "[Touchpoint]";
          return `- ${prefix} ${tp.content}`;
        })
        .join("\n");

      return `**${stageLabels[stage]}:**\n${formatted}`;
    })
    .filter(Boolean);

  return byStage.join("\n\n");
}

function formatBrainstorm(data: BrainstormData): string {
  const notes = data.notes || [];
  const validNotes = notes.filter((n) => n.content?.trim());
  if (validNotes.length === 0) return "";

  const byCategory = validNotes.reduce(
    (acc, note) => {
      const category = note.category || "Ideas";
      if (!acc[category]) acc[category] = [];
      acc[category].push(note.content);
      return acc;
    },
    {} as Record<string, string[]>,
  );

  return Object.entries(byCategory)
    .map(
      ([category, items]) =>
        `**${category}:**\n${items.map((i) => `- ${i}`).join("\n")}`,
    )
    .join("\n\n");
}

/**
 * Formats all user canvas data into a readable context string for AI consumption.
 * Returns empty string if no meaningful content exists.
 */
export function formatCanvasContext(canvases: CanvasItem[]): string {
  if (!canvases || canvases.length === 0) return "";

  const sections: string[] = [];

  for (const canvas of canvases) {
    let formatted = "";

    switch (canvas.canvasType) {
      case "swot":
        formatted = formatSwot(canvas.data as unknown as SwotData);
        if (formatted) {
          sections.push(`### SWOT Analysis\n${formatted}`);
        }
        break;
      case "bmc":
        formatted = formatBmc(canvas.data as unknown as BusinessModelData);
        if (formatted) {
          sections.push(`### Business Model Canvas\n${formatted}`);
        }
        break;
      case "journey":
        formatted = formatJourney(canvas.data as unknown as JourneyData);
        if (formatted) {
          sections.push(`### Customer Journey\n${formatted}`);
        }
        break;
      case "brainstorm":
        formatted = formatBrainstorm(canvas.data as unknown as BrainstormData);
        if (formatted) {
          sections.push(`### Brainstorming Ideas\n${formatted}`);
        }
        break;
    }
  }

  if (sections.length === 0) return "";

  return sections.join("\n\n");
}
