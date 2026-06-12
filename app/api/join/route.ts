import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { MOOD_OPTIONS } from "@/lib/types";
import {
  getSessionTokenFromRequest,
  unauthorizedResponse,
  verifyToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_GENDERS = new Set(["male", "female", "other"]);
const VALID_MOODS = new Set<string>([
  "",
  ...MOOD_OPTIONS.map((m) => m.value),
]);

// POST /api/join — body { id, lat, lng, name, gender, mood? } (raw coords).
// Applies a 1–3 km privacy offset and upserts the presence row. Raw
// coordinates are never stored.
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid body" }, { status: 400 });
    }

    const { id, lat, lng, name, gender, location, mood } = (body ?? {}) as Record<
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
    const trimmedLocation =
      typeof location === "string" ? location.trim().slice(0, 100) : "";
    const trimmedMood =
      typeof mood === "string" ? mood.trim().slice(0, 20) : "";
    if (!VALID_MOODS.has(trimmedMood)) {
      return Response.json({ error: "invalid mood" }, { status: 400 });
    }

    const existing = await prisma.presence.findUnique({
      where: { id },
      select: { id: true },
    });
    if (existing) {
      const sessionToken = getSessionTokenFromRequest(request);
      if (!(await verifyToken(id, sessionToken))) {
        return unauthorizedResponse();
      }
    }

    const offset = applyPrivacyOffset(lat as number, lng as number);
    const trimmedName = name.trim();
    const token = crypto.randomUUID();

    await prisma.presence.upsert({
      where: { id },
      create: {
        id,
        token,
        lat: offset.lat,
        lng: offset.lng,
        name: trimmedName,
        gender,
        location: trimmedLocation,
        mood: trimmedMood,
        busy: false,
        lastSeen: new Date(),
      },
      update: {
        token,
        lat: offset.lat,
        lng: offset.lng,
        name: trimmedName,
        gender,
        location: trimmedLocation,
        mood: trimmedMood,
        lastSeen: new Date(),
        busy: false,
      },
    });

    return Response.json({ ok: true, lat: offset.lat, lng: offset.lng, token });
  } catch (err) {
    console.error("[join] error:", err);
    return Response.json({ error: "internal error" }, { status: 500 });
  }
}
