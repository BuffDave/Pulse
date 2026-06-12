import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { STALE_MS, SIGNAL_TTL_MS } from "@/lib/presence";
import type { Gender, PollResponse } from "@/lib/types";
import { unauthorizedResponse, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// GET /api/poll?id=&token= — the single endpoint that drives the live map.
// It (1) heartbeats the caller, (2) reaps stale presence + orphan signals,
// (3) returns the filtered online peers, and (4) drains this user's mailbox.
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const id = params.get("id");
    const token = params.get("token");

    if (!id || id.length < 8 || id.length > 64) {
      return Response.json({ error: "invalid id" }, { status: 400 });
    }

    if (!(await verifyToken(id, token))) {
      return unauthorizedResponse();
    }

    const now = Date.now();
    const staleCutoff = new Date(now - STALE_MS);
    const signalCutoff = new Date(now - SIGNAL_TTL_MS);
    const reportCutoff = new Date(now - REPORT_TTL_MS);

    // 1) Heartbeat — refresh lastSeen for the caller.
    await prisma.presence.updateMany({
      where: { id },
      data: { lastSeen: new Date(now) },
    });

    // 2) Reap stale presence, orphaned signals, and old reports in parallel.
    await Promise.all([
      prisma.presence.deleteMany({ where: { lastSeen: { lt: staleCutoff } } }),
      prisma.signal.deleteMany({ where: { createdAt: { lt: signalCutoff } } }),
      prisma.report.deleteMany({ where: { createdAt: { lt: reportCutoff } } }),
    ]);

    // 3–4) Online peers, inbox, and own broadcast text — independent reads.
    const [peers, inbox, self] = await Promise.all([
      prisma.presence.findMany({
        where: {
          id: { not: id },
          lastSeen: { gte: staleCutoff },
        },
        select: {
          id: true,
          lat: true,
          lng: true,
          busy: true,
          name: true,
          gender: true,
          location: true,
          mood: true,
          broadcastText: true,
          broadcastAt: true,
        },
      }),
      prisma.signal.findMany({
        where: { toId: id },
        orderBy: { createdAt: "asc" },
      }),
      prisma.presence.findUnique({
        where: { id },
        select: { broadcastText: true },
      }),
    ]);

    // Drain this user's mailbox: delete exactly what we read so a
    // concurrently-inserted signal is never lost.
    if (inbox.length > 0) {
      await prisma.signal.deleteMany({
        where: { id: { in: inbox.map((s) => s.id) } },
      });
    }

    const response: PollResponse = {
      myBroadcastText: self?.broadcastText ?? "",
      peers: peers.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        busy: p.busy,
        name: p.name,
        gender: p.gender as Gender,
        location: p.location,
        mood: p.mood,
        broadcastText: p.broadcastText,
      })),
      signals: inbox.map((s) => ({
        id: s.id,
        fromId: s.fromId,
        toId: s.toId,
        type: s.type as PollResponse["signals"][number]["type"],
        payload: s.payload,
        createdAt: s.createdAt.toISOString(),
      })),
    };

    return Response.json(response);
  } catch (err) {
    console.error("[poll] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
