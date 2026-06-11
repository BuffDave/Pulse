import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/report — body { reporterId, reportedId }
export async function POST(request: NextRequest) {
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

  await prisma.report.create({
    data: { reporterId, reportedId },
  });

  return Response.json({ ok: true });
}
