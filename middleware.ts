import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: swap in-memory store for Upstash Redis on multi-instance production.
const buckets = new Map<string, { count: number; windowStart: number }>();

const LIMITS: Record<string, number> = {
  "/api/join": 10,
  "/api/signal": 120,
  "/api/report": 5,
};

const WINDOW_MS = 60_000;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const limit = LIMITS[pathname];
  if (!limit) return NextResponse.next();

  const ip = getClientIp(request);
  const key = `${pathname}:${ip}`;

  if (isRateLimited(key, limit)) {
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/join", "/api/signal", "/api/report"],
};
