import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionTokenFromRequest,
  unauthorizedResponse,
  verifyToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave — body { id, token? }. Removes the presence row and any pending
// signals to/from this user. Called via navigator.sendBeacon on tab close, so
// the body may arrive as text — parse defensively.
export async function POST(request: NextRequest) {
  try {
    let id: string | undefined;
    let bodyToken: string | undefined;
    try {
      const text = await request.text();
      if (text) {
        const parsed = JSON.parse(text) as { id?: string; token?: string };
        id = parsed.id;
        bodyToken = parsed.token;
      }
    } catch {
      id = undefined;
      bodyToken = undefined;
    }

    if (typeof id !== "string" || id.length < 8 || id.length > 64) {
      return Response.json({ error: "invalid id" }, { status: 400 });
    }

    const sessionToken = bodyToken ?? getSessionTokenFromRequest(request);
    if (!(await verifyToken(id, sessionToken))) {
      return unauthorizedResponse();
    }

    // Independent cleanup deletes — no atomicity needed (and interactive
    // transactions are unreliable over a PgBouncer pooler).
    await prisma.signal.deleteMany({
      where: { OR: [{ toId: id }, { fromId: id }] },
    });
    await prisma.presence.deleteMany({ where: { id } });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[leave] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
