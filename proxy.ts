import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ProxyConfig } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const LIMITS: Record<string, number> = {
  "/api/join": 10,
  "/api/signal": 120,
  "/api/report": 5,
  "/api/poll": 120,
  "/api/ice": 5,
  "/api/megaphone": 20,
  "/api/busy": 30,
  "/api/leave": 10,
};

const WINDOW_MS = 60_000;

const upstashEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const upstashLimiters = upstashEnabled
  ? Object.fromEntries(
      Object.entries(LIMITS).map(([pathname, limit]) => [
        pathname,
        new Ratelimit({
          redis: Redis.fromEnv(),
          prefix: `pulse:rl:${pathname}`,
          limiter: Ratelimit.slidingWindow(limit, "60 s"),
        }),
      ]),
    )
  : null;

// In-memory fallback for local dev when Upstash env vars are absent.
const buckets = new Map<string, { count: number; windowStart: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimitedInMemory(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const limit = LIMITS[pathname];
  if (!limit) return NextResponse.next();

  const ip = getClientIp(request);

  if (upstashLimiters) {
    const limiter = upstashLimiters[pathname];
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
    }
  } else {
    const key = `${pathname}:${ip}`;
    if (isRateLimitedInMemory(key, limit)) {
      return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
    }
  }

  return NextResponse.next();
}

export const config: ProxyConfig = {
  matcher: [
    "/api/join",
    "/api/signal",
    "/api/report",
    "/api/poll",
    "/api/ice",
    "/api/megaphone",
    "/api/busy",
    "/api/leave",
  ],
};
