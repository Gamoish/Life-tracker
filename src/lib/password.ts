import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Node-only. Kept out of session.ts so middleware (Edge runtime) never pulls in
 * `node:crypto`.
 */
export function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;

  // Hash both sides first so the buffers are always 32 bytes — timingSafeEqual
  // throws on length mismatch, which would itself leak the password length.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
