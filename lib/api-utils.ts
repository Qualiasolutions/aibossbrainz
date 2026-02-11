import "server-only";

import { ChatSDKError } from "./errors";

/**
 * Safely parse JSON from a Request body.
 * Returns the parsed data or throws a ChatSDKError with proper 400 response.
 */
export async function safeParseJson<T = unknown>(request: Request): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ChatSDKError("bad_request:api", "Invalid JSON in request body");
  }
}

/**
 * Safely parse JSON from a Request body with result type.
 * Returns { success: true, data } or { success: false, error: Response }
 */
export async function safeParseJsonResult<T = unknown>(
  request: Request,
): Promise<{ success: true; data: T } | { success: false; error: Response }> {
  try {
    const data = await request.json();
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: new ChatSDKError(
        "bad_request:api",
        "Invalid JSON in request body",
      ).toResponse(),
    };
  }
}
