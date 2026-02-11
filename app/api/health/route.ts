import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // Test Supabase connection
    const supabase = await createClient();
    const { error } = await supabase.from("User").select("id").limit(1);

    const dbTest = {
      success: !error,
      message: error ? error.message : "Connected to Supabase",
    };

    // Check environment variables
    const envStatus = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: env.NODE_ENV,
      vercelEnv: env.VERCEL_ENV || "local",
      blobToken: !!env.BLOB_READ_WRITE_TOKEN,
      redisUrl: !!env.REDIS_URL,
    };

    // Get system information
    const systemInfo = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
    };

    const healthStatus = {
      status: "healthy",
      database: dbTest,
      environment: envStatus,
      system: systemInfo,
    };

    // Return appropriate HTTP status based on health checks
    const statusCode = dbTest.success ? 200 : 503;

    return NextResponse.json(healthStatus, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  }
}
