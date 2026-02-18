import { tool } from "ai";
import { z } from "zod";
import type { Session } from "@/lib/artifacts/server";
import { getStrategyCanvas, saveStrategyCanvas } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CanvasType } from "@/lib/supabase/types";

type StrategyCanvasProps = {
	session: Session;
};

// Map sections to their canvas types
const sectionToCanvasType: Record<string, CanvasType> = {
	// SWOT
	strengths: "swot",
	weaknesses: "swot",
	opportunities: "swot",
	threats: "swot",
	// BMC
	keyPartners: "bmc",
	keyActivities: "bmc",
	keyResources: "bmc",
	valuePropositions: "bmc",
	customerRelationships: "bmc",
	channels: "bmc",
	customerSegments: "bmc",
	costStructure: "bmc",
	revenueStreams: "bmc",
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

			const canvasType = sectionToCanvasType[section];
			if (!canvasType) {
				return {
					success: false,
					message: `Unknown section: ${section}. Valid sections are: ${Object.keys(sectionToCanvasType).join(", ")}`,
				};
			}

			try {
				// Get existing canvas for this type
				const existingCanvas = await getStrategyCanvas({
					userId: session.user.id,
					canvasType,
				});

				// Parse existing data or start fresh
				const currentData: Record<
					string,
					Array<{ id: string; content: string; color: string }>
				> = existingCanvas?.data &&
				typeof existingCanvas.data === "object" &&
				!Array.isArray(existingCanvas.data)
					? (existingCanvas.data as Record<
							string,
							Array<{ id: string; content: string; color: string }>
						>)
					: {};

				// Journey canvas stores items in a flat `touchpoints` array
				// with a `stage` field, not as top-level section keys.
				if (canvasType === "journey") {
					const journeyData = currentData as unknown as {
						touchpoints?: Array<{
							id: string;
							stage: string;
							content: string;
							type: string;
						}>;
					};
					if (!journeyData.touchpoints) {
						journeyData.touchpoints = [];
					}
					const newTouchpoints = items.map((content) => ({
						id: generateUUID(),
						stage: section,
						content,
						type: "touchpoint" as const,
					}));
					journeyData.touchpoints.push(...newTouchpoints);
				} else {
					// SWOT, BMC, Brainstorm: use section keys directly
					const newItems = items.map((content) => ({
						id: generateUUID(),
						content,
						color: "slate",
					}));

					if (!currentData[section]) {
						currentData[section] = [];
					}
					currentData[section].push(...newItems);
				}

				// Save back to the canvas
				await saveStrategyCanvas({
					userId: session.user.id,
					canvasType,
					data: currentData,
					canvasId: existingCanvas?.id,
					isDefault: true,
				});

				// Map section to tab name for user-friendly messaging
				const tabNames: Record<CanvasType, string> = {
					swot: "SWOT",
					bmc: "Business Model",
					journey: "Customer Journey",
					brainstorm: "Brainstorm",
				};

				return {
					success: true,
					section,
					itemsAdded: items.length,
					tab: tabNames[canvasType],
					message: `Added ${items.length} item(s) to ${section} in the ${tabNames[canvasType]} tab. Continue populating other sections, then tell the user to visit /strategy-canvas.`,
				};
			} catch (error) {
				if (error instanceof ChatSDKError) {
					return {
						success: false,
						message:
							"Database error while saving canvas data. Please try again.",
					};
				}
				logger.error({ err: error, section, canvasType }, "Strategy canvas unexpected error");
				return {
					success: false,
					message:
						"An unexpected error occurred while saving canvas data. Please try again.",
				};
			}
		},
	});
