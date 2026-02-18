import { NextResponse } from "next/server";
import { isCircuitOpen } from "@/lib/resilience";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/**
 * Probe OpenRouter API reachability by hitting the key validation endpoint.
 * Returns status and latency in ms. Times out after 5 seconds.
 */
async function probeOpenRouter(): Promise<{
	status: "up" | "down";
	latencyMs?: number;
}> {
	if (!process.env.OPENROUTER_API_KEY) return { status: "down" };

	const start = Date.now();
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);
		const res = await fetch("https://openrouter.ai/api/v1/key", {
			headers: {
				Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
			},
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return {
			status: res.ok ? "up" : "down",
			latencyMs: Date.now() - start,
		};
	} catch {
		return { status: "down" };
	}
}

export async function GET() {
	const services: Record<
		string,
		{ status: "up" | "down"; latencyMs?: number }
	> = {};
	let overall: "healthy" | "degraded" = "healthy";

	// Check Supabase connectivity and probe OpenRouter in parallel
	const [dbResult, openRouterProbe] = await Promise.all([
		(async () => {
			try {
				const supabase = createServiceClient();
				const { error } = await supabase.from("User").select("id").limit(1);
				return { status: (error ? "down" : "up") as "up" | "down" };
			} catch {
				return { status: "down" as const };
			}
		})(),
		probeOpenRouter(),
	]);

	services.database = { status: dbResult.status };
	if (dbResult.status === "down") overall = "degraded";

	// OpenRouter probe result
	services.openrouter = {
		status: openRouterProbe.status,
		...(openRouterProbe.latencyMs !== undefined && {
			latencyMs: openRouterProbe.latencyMs,
		}),
	};
	if (openRouterProbe.status === "down") overall = "degraded";

	// Check circuit breaker states
	const aiGatewayOpen = isCircuitOpen("ai-gateway");
	const elevenLabsOpen = isCircuitOpen("elevenlabs");

	services["ai-gateway"] = { status: aiGatewayOpen ? "down" : "up" };
	services.elevenlabs = { status: elevenLabsOpen ? "down" : "up" };

	if (aiGatewayOpen) overall = "degraded";

	// Secondary AI provider configuration status (informational, not degraded if missing)
	services["secondary-ai"] = {
		status: process.env.GOOGLE_AI_API_KEY ? "up" : "down",
	};

	const statusCode = overall === "healthy" ? 200 : 503;

	// Authenticated users get full service details for debugging.
	// Unauthenticated callers (monitoring probes) get only a status string.
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (user) {
			return NextResponse.json(
				{
					status: overall,
					timestamp: new Date().toISOString(),
					services,
				},
				{ status: statusCode },
			);
		}
	} catch {
		// Auth check failed -- fall through to minimal response
	}

	// Unauthenticated: minimal response (no service names, no timestamp)
	return NextResponse.json(
		{ status: overall === "healthy" ? "ok" : "degraded" },
		{ status: statusCode },
	);
}
