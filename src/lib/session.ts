import { SignJWT, jwtVerify } from "jose";

/**
 * Session token helpers. Deliberately free of `node:*` imports — middleware
 * runs on the Edge runtime, so this has to work on WebCrypto alone. That's why
 * `jose` rather than `jsonwebtoken`.
 */

export const SESSION_COOKIE = "tracker_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    // Off by default: you'll reach this over plain http:// on your LAN from
    // your phone, and a Secure cookie would simply never be sent.
    secure: process.env.COOKIE_SECURE === "true",
  };
}
