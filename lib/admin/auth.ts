import "server-only";
import { createHmac } from "crypto";

export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface SessionPayload {
  authenticated: boolean;
  iat: number;
}

function getSecret(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD 环境变量未设置");
  return password;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSession(): string {
  const secret = getSecret();
  const payload: SessionPayload = {
    authenticated: true,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

export function verifySession(cookie: string): boolean {
  try {
    const secret = getSecret();
    const [encoded, signature] = cookie.split(".");
    if (!encoded || !signature) return false;

    const expected = sign(encoded, secret);
    if (signature !== expected) return false;

    const payload: SessionPayload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    );
    if (!payload.authenticated) return false;

    const age = Math.floor(Date.now() / 1000) - payload.iat;
    if (age > SESSION_MAX_AGE) return false;

    return true;
  } catch {
    return false;
  }
}
