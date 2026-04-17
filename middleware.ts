import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = "admin_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

async function hmacSign(
  data: string,
  secret: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function verifySessionEdge(
  cookie: string,
  secret: string
): Promise<boolean> {
  try {
    const [encoded, signature] = cookie.split(".");
    if (!encoded || !signature) return false;

    const expected = await hmacSign(encoded, secret);
    if (signature !== expected) return false;

    const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.authenticated) return false;

    const age = Math.floor(Date.now() / 1000) - payload.iat;
    return age <= SESSION_MAX_AGE;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Admin panel not configured
  if (!adminPassword) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json(
        { error: "Admin panel not configured" },
        { status: 503 }
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Skip login page
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = sessionCookie
    ? await verifySessionEdge(sessionCookie, adminPassword)
    : false;

  if (!isValid) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
