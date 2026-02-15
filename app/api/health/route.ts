import { NextResponse } from "next/server";
import { isCircuitOpen } from "@/lib/resilience";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

export async function GET() {
	const services: Record<string, { status: "up" | "down" }> = {};
	let overall: "healthy" | "degraded" = "healthy";

	// Check Supabase connectivity
	try {
		const supabase = createServiceClient();
		const { error } = await supabase.from("User").select("id").limit(1);
		services.database = { status: error ? "down" : "up" };
		if (error) overall = "degraded";
	} catch {
		services.database = { status: "down" };
		overall = "degraded";
	}

	// Check circuit breaker states
	const aiGatewayOpen = isCircuitOpen("ai-gateway");
	const elevenLabsOpen = isCircuitOpen("elevenlabs");

	services["ai-gateway"] = { status: aiGatewayOpen ? "down" : "up" };
	services.elevenlabs = { status: elevenLabsOpen ? "down" : "up" };

	if (aiGatewayOpen) overall = "degraded";

	return NextResponse.json(
		{
			status: overall,
			timestamp: new Date().toISOString(),
			services,
		},
		{ status: overall === "healthy" ? 200 : 503 },
	);
}
