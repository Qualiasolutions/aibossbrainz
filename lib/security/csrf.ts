import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "__csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

// CSRF secret - uses AUTH_SECRET, fails hard in production if missing
function getCsrfSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // In production, this is a critical security issue - fail hard
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is required in production for CSRF protection",
      );
    }
    // In development, warn and use a fallback
    console.warn(
      "AUTH_SECRET not set - using development fallback (DO NOT use in production)",
    );
    return "dev-csrf-secret-not-for-production";
  }
  return secret;
}

/**
 * Generates a CSRF token using HMAC-based approach
 * Token = random + HMAC(random, secret)
 */
export function generateCsrfToken(): string {
  const random = randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  const hash = createHash("sha256")
    .update(`${random}${getCsrfSecret()}`)
    .digest("hex");
  return `${random}.${hash}`;
}

/**
 * Validates a CSRF token
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [random, providedHash] = parts;
  if (!random || !providedHash) {
    return false;
  }

  const expectedHash = createHash("sha256")
    .update(`${random}${getCsrfSecret()}`)
    .digest("hex");

  // Timing-safe comparison
  if (providedHash.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedHash.length; i++) {
    result |= providedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Sets a CSRF token cookie
 */
export async function setCsrfCookie(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Gets the CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value;
}

/**
 * Validates CSRF token from request headers against cookie
 */
export async function validateCsrfRequest(
  request: Request,
): Promise<{ valid: boolean; error?: string }> {
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = await getCsrfToken();

  if (!cookieToken) {
    return { valid: false, error: "No CSRF cookie found" };
  }

  if (!headerToken) {
    return { valid: false, error: "No CSRF token in request headers" };
  }

  if (headerToken !== cookieToken) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  if (!validateCsrfToken(headerToken)) {
    return { valid: false, error: "Invalid CSRF token format" };
  }

  return { valid: true };
}
