import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionTokenFromRequest,
  unauthorizedResponse,
  verifyToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LEN = 100;

function validateId(id: unknown): id is string {
  return typeof id === "string" && id.length >= 8 && id.length <= 64;
}

// POST /api/megaphone — body { id, text }
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { id, text } = (body ?? {}) as Record<string, unknown>;

    if (!validateId(id)) {
      return Response.json({ error: "invalid id" }, { status: 400 });
    }
    if (typeof text !== "string") {
      return Response.json({ error: "invalid text" }, { status: 400 });
    }

    const sessionToken = getSessionTokenFromRequest(request);
    if (!(await verifyToken(id, sessionToken))) {
      return unauthorizedResponse();
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return Response.json({ error: "empty text" }, { status: 400 });
    }
    if (trimmed.length > MAX_TEXT_LEN) {
      return Response.json({ error: "text too long" }, { status: 400 });
    }

    const presence = await prisma.presence.findUnique({
      where: { id },
      select: { broadcastText: true },
    });
    if (!presence) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    if (presence.broadcastText.length > 0) {
      return Response.json({ error: "already active" }, { status: 409 });
    }

    const now = Date.now();
    await prisma.presence.update({
      where: { id },
      data: {
        broadcastText: trimmed,
        broadcastAt: new Date(now),
      },
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[megaphone] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}

// DELETE /api/megaphone — body { id }
export async function DELETE(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { id } = (body ?? {}) as Record<string, unknown>;

    if (!validateId(id)) {
      return Response.json({ error: "invalid id" }, { status: 400 });
    }

    const sessionToken = getSessionTokenFromRequest(request);
    if (!(await verifyToken(id, sessionToken))) {
      return unauthorizedResponse();
    }

    const result = await prisma.presence.updateMany({
      where: { id },
      data: {
        broadcastText: "",
        broadcastAt: null,
      },
    });

    if (result.count === 0) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[megaphone] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
