// Strategy Canvas Types

export interface StickyNote {
	id: string;
	content: string;
	color: NoteColor;
	x?: number;
	y?: number;
	category?: string;
}

export type NoteColor =
	| "rose"
	| "amber"
	| "emerald"
	| "blue"
	| "purple"
	| "slate";

export interface SwotData {
	strengths: StickyNote[];
	weaknesses: StickyNote[];
	opportunities: StickyNote[];
	threats: StickyNote[];
}

export interface JourneyTouchpoint {
	id: string;
	stage: JourneyStage;
	content: string;
	type: "touchpoint" | "pain" | "opportunity";
}

export type JourneyStage =
	| "awareness"
	| "consideration"
	| "decision"
	| "purchase"
	| "retention"
	| "advocacy";

export interface BusinessModelData {
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

export type { CanvasType } from "@/lib/supabase/types";
