import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

const DEFAULT_STUN: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

// GET /api/ice — short-lived Cloudflare TURN credentials for WebRTC.
export async function GET() {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

  if (!keyId || !apiToken) {
    return NextResponse.json({ iceServers: DEFAULT_STUN });
  }

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl: 3_600 }),
      },
    );

    if (!res.ok) {
      console.error("Cloudflare TURN credential error:", res.status, await res.text());
      return NextResponse.json({ iceServers: DEFAULT_STUN });
    }

    const data = (await res.json()) as { iceServers?: IceServerConfig[] };
    const iceServers =
      Array.isArray(data.iceServers) && data.iceServers.length > 0
        ? data.iceServers
        : DEFAULT_STUN;

    return NextResponse.json({ iceServers });
  } catch (err) {
    console.error("Cloudflare TURN fetch failed:", err);
    return NextResponse.json({ iceServers: DEFAULT_STUN });
  }
}
