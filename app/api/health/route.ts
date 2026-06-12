import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/health — liveness probe for uptime monitors and load balancers.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "ok" });
  } catch (err) {
    console.error("[health] error:", err);
    return Response.json({ ok: false, db: "error" }, { status: 503 });
  }
}
