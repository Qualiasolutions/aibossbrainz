import { ChatSDKError } from "@/lib/errors";
import { validateCsrfRequest } from "@/lib/security/csrf";

type RouteHandlerNoContext = (request: Request) => Promise<Response>;

type RouteHandlerWithContext<TContext> = (
  request: Request,
  context: TContext,
) => Promise<Response>;

/**
 * Higher-order function that wraps route handlers with CSRF validation.
 * Use this for all state-changing operations (POST, PUT, PATCH, DELETE).
 *
 * @example
 * export const POST = withCsrf(async (request: Request) => {
 *   // Your handler logic here - CSRF already validated
 *   return Response.json({ success: true });
 * });
 */
export function withCsrf<TContext>(
  handler: RouteHandlerWithContext<TContext>,
): RouteHandlerWithContext<TContext>;
export function withCsrf(handler: RouteHandlerNoContext): RouteHandlerNoContext;
export function withCsrf(
  handler: RouteHandlerNoContext | RouteHandlerWithContext<unknown>,
): RouteHandlerNoContext | RouteHandlerWithContext<unknown> {
  return async (request: Request, context?: unknown): Promise<Response> => {
    const csrf = await validateCsrfRequest(request);

    if (!csrf.valid) {
      return new ChatSDKError("forbidden:api", csrf.error).toResponse();
    }

    if (context !== undefined) {
      return (handler as RouteHandlerWithContext<unknown>)(request, context);
    }
    return (handler as RouteHandlerNoContext)(request);
  };
}
