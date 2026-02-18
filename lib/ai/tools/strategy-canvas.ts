import { tool } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/artifacts/server";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CanvasType } from "@/lib/supabase/types";

type StrategyCanvasProps = {
	session: Session;
};

// Map normalized (lowercase) sections to their canvas types
const sectionToCanvasType: Record<string, CanvasType> = {
	// SWOT
	strengths: "swot",
	weaknesses: "swot",
	opportunities: "swot",
	threats: "swot",
	// BMC (lowercase keys for lookup after normalization)
	keypartners: "bmc",
	keyactivities: "bmc",
	keyresources: "bmc",
	valuepropositions: "bmc",
	customerrelationships: "bmc",
	channels: "bmc",
	customersegments: "bmc",
	coststructure: "bmc",
	revenuestreams: "bmc",
	// Journey
	awareness: "journey",
	consideration: "journey",
	decision: "journey",
	purchase: "journey",
	retention: "journey",
	advocacy: "journey",
	// Brainstorm
	notes: "brainstorm",
};

// Map normalized sections to their correct storage keys (for BMC which uses camelCase)
const sectionToStorageKey: Record<string, string> = {
	// SWOT - already lowercase
	strengths: "strengths",
	weaknesses: "weaknesses",
	opportunities: "opportunities",
	threats: "threats",
	// BMC - need camelCase for storage
	keypartners: "keyPartners",
	keyactivities: "keyActivities",
	keyresources: "keyResources",
	valuepropositions: "valuePropositions",
	customerrelationships: "customerRelationships",
	channels: "channels",
	customersegments: "customerSegments",
	coststructure: "costStructure",
	revenuestreams: "revenueStreams",
	// Journey - uses touchpoints array, not section keys
	awareness: "awareness",
	consideration: "consideration",
	decision: "decision",
	purchase: "purchase",
	retention: "retention",
	advocacy: "advocacy",
	// Brainstorm
	notes: "notes",
};

// Generate UUID
function generateUUID(): string {
	return crypto.randomUUID();
}

const strategyCanvasSchema = z.object({
	action: z
		.enum(["populate"])
		.describe("Action to perform - populate adds items to the user's canvas"),
	section: z
		.string()
		.describe(
			"Section to add items to. SWOT: strengths/weaknesses/opportunities/threats. BMC: keyPartners/keyActivities/keyResources/valuePropositions/customerRelationships/channels/customerSegments/costStructure/revenueStreams. Journey: awareness/consideration/decision/purchase/retention/advocacy. Brainstorm: notes",
		),
	items: z
		.array(z.string())
		.describe(
			"Items to add to the specified section (3-5 items per section recommended)",
		),
});

type StrategyCanvasInput = z.infer<typeof strategyCanvasSchema>;

export const strategyCanvas = ({ session }: StrategyCanvasProps) =>
	tool({
		description: `Add strategic insights to the user's Strategy Canvas at /strategy-canvas.

The Strategy Canvas has 4 tabs - populate ALL relevant sections when doing strategic analysis:

**SWOT Analysis:**
- strengths: Internal advantages (3-5 items)
- weaknesses: Internal challenges (3-5 items)
- opportunities: External possibilities (3-5 items)
- threats: External risks (3-5 items)

**Business Model Canvas (BMC):**
- keyPartners, keyActivities, keyResources, valuePropositions
- customerRelationships, channels, customerSegments
- costStructure, revenueStreams

**Customer Journey:**
- awareness, consideration, decision, purchase, retention, advocacy

**Brainstorm:**
- notes: Free-form ideas

Call this tool MULTIPLE times - once per section you want to populate.
After populating, tell the user to visit /strategy-canvas to see and edit their canvas.`,
		inputSchema: strategyCanvasSchema,
		execute: async ({ action, section, items }: StrategyCanvasInput) => {
			if (!session?.user?.id) {
				return {
					success: false,
					message: "User must be logged in to save canvas data.",
				};
			}

			if (action !== "populate" || !section || !items || items.length === 0) {
				return {
					success: false,
					message: "Invalid action or missing section/items.",
				};
			}

			const normalizedSection = section.toLowerCase();
			const canvasType = sectionToCanvasType[normalizedSection];
			if (!canvasType) {
				return {
					success: false,
					message: `Unknown section: ${section}. Valid sections are: ${Object.keys(sectionToCanvasType).join(", ")}`,
				};
			}

			try {
				// Use correct storage key (camelCase for BMC)
				const storageKey =
					sectionToStorageKey[normalizedSection] || normalizedSection;

				// Build items as JSONB for atomic merge
				let itemsJson: unknown[];
				if (canvasType === "journey") {
					itemsJson = items.map((content) => ({
						id: generateUUID(),
						stage: normalizedSection,
						content,
						type: "touchpoint",
					}));
				} else if (canvasType === "brainstorm") {
					itemsJson = items.map((content, idx) => ({
						id: generateUUID(),
						content,
						color: "slate",
						category: "Ideas",
						x: Math.random() * 60 + 10,
						y: Math.random() * 40 + 10 + idx * 10,
					}));
				} else {
					itemsJson = items.map((content) => ({
						id: generateUUID(),
						content,
						color: "slate",
					}));
				}

				// Use the atomic merge function to prevent race conditions
				// when multiple tool calls execute concurrently
				const sectionKey =
					canvasType === "journey" ? "touchpoints" : storageKey;

				const supabase = (
					await import("@/lib/supabase/server")
				).createClient;
				const client = await supabase();
				const { error } = await (client.rpc as any)(
					"merge_canvas_items",
					{
						p_user_id: session.user.id,
						p_canvas_type: canvasType,
						p_section: sectionKey,
						p_items: JSON.stringify(itemsJson),
					},
				);

				if (error) {
					logger.error(
						{ err: error, section, canvasType },
						"Strategy canvas merge error",
					);
					throw error;
				}

				// Map section to tab name for user-friendly messaging
				const tabNames: Record<CanvasType, string> = {
					swot: "SWOT",
					bmc: "Business Model",
					journey: "Customer Journey",
					brainstorm: "Brainstorm",
				};

				return {
					success: true,
					section: normalizedSection,
					itemsAdded: items.length,
					tab: tabNames[canvasType],
					message: `Added ${items.length} item(s) to ${normalizedSection} in the ${tabNames[canvasType]} tab.`,
				};
			} catch (error) {
				if (error instanceof ChatSDKError) {
					return {
						success: false,
						message:
							"Database error while saving canvas data. Please try again.",
					};
				}
				logger.error(
					{ err: error, section, canvasType },
					"Strategy canvas unexpected error",
				);
				return {
					success: false,
					message:
						"An unexpected error occurred while saving canvas data. Please try again.",
				};
			}
		},
	});
