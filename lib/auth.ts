import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function verifyToken(
  id: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (
    !token ||
    typeof token !== "string" ||
    token.length < 8 ||
    token.length > 64
  ) {
    return false;
  }
  const row = await prisma.presence.findUnique({
    where: { id },
    select: { token: true },
  });
  return row?.token === token;
}

export function getSessionTokenFromRequest(
  request: NextRequest,
): string | null {
  return request.headers.get("x-session-token");
}

export function unauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}
