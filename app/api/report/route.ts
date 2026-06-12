import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionTokenFromRequest,
  unauthorizedResponse,
  verifyToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/report — body { reporterId, reportedId }
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { reporterId, reportedId } = (body ?? {}) as Record<string, unknown>;

    if (
      typeof reporterId !== "string" ||
      reporterId.length < 8 ||
      reporterId.length > 64
    ) {
      return Response.json({ error: "invalid reporterId" }, { status: 400 });
    }
    if (
      typeof reportedId !== "string" ||
      reportedId.length < 8 ||
      reportedId.length > 64
    ) {
      return Response.json({ error: "invalid reportedId" }, { status: 400 });
    }
    if (reporterId === reportedId) {
      return Response.json({ error: "cannot report self" }, { status: 400 });
    }

    const sessionToken = getSessionTokenFromRequest(request);
    if (!(await verifyToken(reporterId, sessionToken))) {
      return unauthorizedResponse();
    }

    await prisma.report.upsert({
      where: {
        reporterId_reportedId: { reporterId, reportedId },
      },
      create: { reporterId, reportedId },
      update: {},
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[report] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
