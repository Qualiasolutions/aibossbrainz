import { z } from "zod";
import {
  deleteStrategyCanvas,
  getAllUserCanvases,
  getStrategyCanvas,
  saveStrategyCanvas,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { withCsrf } from "@/lib/security/with-csrf";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

const CANVAS_TYPES = ["swot", "bmc", "journey", "brainstorm"] as const;
const MAX_DATA_SIZE = 100_000; // ~100KB

const canvasPostSchema = z.object({
  canvasType: z.enum(CANVAS_TYPES),
  data: z.record(z.unknown()).transform((v) => v as unknown as Json),
  name: z.string().max(200).optional(),
  canvasId: z.string().uuid().optional(),
  isDefault: z.boolean().optional(),
});

// GET - Fetch canvas(es)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const canvasId = searchParams.get("id");

    if (canvasId) {
      const canvas = await getStrategyCanvas({ userId: user.id, canvasId });
      return Response.json(canvas);
    }

    if (typeParam) {
      const parsed = z.enum(CANVAS_TYPES).safeParse(typeParam);
      if (!parsed.success) {
        return new ChatSDKError("bad_request:api").toResponse();
      }
      const canvas = await getStrategyCanvas({
        userId: user.id,
        canvasType: parsed.data,
      });
      return Response.json(canvas);
    }

    // Return all canvases
    const canvases = await getAllUserCanvases({ userId: user.id });
    return Response.json(canvases);
  } catch (error) {
    console.error("[Canvas API] GET error:", error);
    return new ChatSDKError("bad_request:database").toResponse();
  }
}

// POST - Save canvas
export const POST = withCsrf(async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const body = await request.json();

    // Check payload size before parsing
    const dataStr = JSON.stringify(body.data);
    if (dataStr.length > MAX_DATA_SIZE) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    const parseResult = canvasPostSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { canvasType, name, data, canvasId, isDefault } = parseResult.data;

    const id = await saveStrategyCanvas({
      userId: user.id,
      canvasType,
      name,
      data,
      canvasId,
      isDefault: isDefault ?? true,
    });

    return Response.json({ id, success: true });
  } catch (error) {
    console.error("[Canvas API] POST error:", error);
    return new ChatSDKError("bad_request:database").toResponse();
  }
});

// DELETE - Delete canvas
export const DELETE = withCsrf(async (request: Request) => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const { searchParams } = new URL(request.url);
    const canvasId = searchParams.get("id");

    if (!canvasId) {
      return new ChatSDKError("bad_request:api").toResponse();
    }

    await deleteStrategyCanvas({ userId: user.id, canvasId });
    return Response.json({ success: true });
  } catch (error) {
    console.error("[Canvas API] DELETE error:", error);
    return new ChatSDKError("bad_request:database").toResponse();
  }
});
