import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/busy — body { id, busy: boolean }
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, busy } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || id.length < 8 || id.length > 64) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (typeof busy !== "boolean") {
    return Response.json({ error: "invalid busy" }, { status: 400 });
  }

  await prisma.presence.updateMany({
    where: { id },
    data: { busy },
  });

  return Response.json({ ok: true });
}
