import { registerOTel } from "@vercel/otel";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

export async function register() {
  // Register OpenTelemetry
  registerOTel({ serviceName: "ai-chatbot" });

  // Initialize Sentry for server-side
  if (process.env.NODE_ENV === "production" && env.SENTRY_DSN) {
    Sentry.init({
      dsn: env.SENTRY_DSN,

      // Enable structured logging
      enableLogs: true,

      // Performance monitoring
      tracesSampleRate: 0.1, // 10% of transactions

      // Filter out noisy errors
      ignoreErrors: [
        // Network timeouts
        "ETIMEDOUT",
        "ECONNRESET",
        "ECONNREFUSED",
        // Rate limiting (expected behavior)
        "rate_limit:",
        // User auth issues (not bugs)
        "unauthorized:",
      ],

      // Before sending error, filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          const headers = event.request.headers;
          const sensitiveHeaders = [
            "authorization",
            "cookie",
            "x-auth-token",
            "x-csrf-token",
          ];
          for (const header of sensitiveHeaders) {
            if (headers[header]) {
              headers[header] = "[REDACTED]";
            }
          }
        }

        // Remove sensitive data from extras
        if (event.extra) {
          const sensitiveKeys = ["password", "token", "secret", "apiKey", "key"];
          for (const key of Object.keys(event.extra)) {
            if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
              event.extra[key] = "[REDACTED]";
            }
          }
        }

        return event;
      },

      integrations: [
        // Capture console.error as Sentry logs on server
        Sentry.consoleLoggingIntegration({ levels: ["error"] }),
      ],
    });
  }
}

// Capture request errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;
