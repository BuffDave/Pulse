import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_GENDERS = new Set(["male", "female", "other"]);

// POST /api/join — body { id, lat, lng, name, gender } (raw coords).
// Applies a 1–3 km privacy offset and upserts the presence row. Raw
// coordinates are never stored.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, lat, lng, name, gender } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof id !== "string" || id.length < 8 || id.length > 64) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 30) {
    return Response.json({ error: "invalid name" }, { status: 400 });
  }
  if (typeof gender !== "string" || !VALID_GENDERS.has(gender)) {
    return Response.json({ error: "invalid gender" }, { status: 400 });
  }

  const offset = applyPrivacyOffset(lat as number, lng as number);
  const trimmedName = name.trim();

  await prisma.presence.upsert({
    where: { id },
    create: {
      id,
      lat: offset.lat,
      lng: offset.lng,
      name: trimmedName,
      gender,
      busy: false,
      lastSeen: new Date(),
    },
    update: {
      lat: offset.lat,
      lng: offset.lng,
      name: trimmedName,
      gender,
      lastSeen: new Date(),
      busy: false,
    },
  });

  return Response.json({ ok: true });
}
