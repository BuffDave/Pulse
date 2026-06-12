import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import {
  getSessionTokenFromRequest,
  unauthorizedResponse,
  verifyToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024; // SDP/ICE are small; cap to be safe.

// POST /api/signal — body { fromId, toId, type, payload? }
// Drops one message into the recipient's mailbox.
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { fromId, toId, type, payload } = (body ?? {}) as Record<
      string,
      unknown
    >;

    if (
      typeof fromId !== "string" ||
      fromId.length < 8 ||
      fromId.length > 64 ||
      typeof toId !== "string" ||
      toId.length < 8 ||
      toId.length > 64
    ) {
      return Response.json({ error: "invalid ids" }, { status: 400 });
    }
    if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
      return Response.json({ error: "invalid type" }, { status: 400 });
    }
    if (
      payload !== undefined &&
      payload !== null &&
      (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
    ) {
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }

    const sessionToken = getSessionTokenFromRequest(request);
    if (!(await verifyToken(fromId, sessionToken))) {
      return unauthorizedResponse();
    }

    const signalType = type as SignalType;
    const payloadStr = typeof payload === "string" ? payload : null;

    // If the target went offline, auto-decline connection requests.
    if (signalType === "request") {
      const target = await prisma.presence.findUnique({
        where: { id: toId },
        select: { id: true },
      });
      if (!target) {
        await sendDecline(toId, fromId);
        return Response.json({ ok: true, autoDeclined: true });
      }
    }

    await prisma.signal.create({
      data: { fromId, toId, type: signalType, payload: payloadStr },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[signal] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

// Helper: deliver an auto-decline from `target` back to `initiator`.
async function sendDecline(targetId: string, initiatorId: string) {
  await prisma.signal.create({
    data: { fromId: targetId, toId: initiatorId, type: "decline", payload: null },
  });
}
