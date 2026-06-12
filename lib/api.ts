// Client-side helpers for talking to the coordination API.
import type { PollResponse, SignalType } from "@/lib/types";

const DEFAULT_STUN: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
];

let _sessionToken = "";

export function setSessionToken(token: string): void {
  _sessionToken = token;
}

function authHeader(): Record<string, string> {
  return _sessionToken ? { "X-Session-Token": _sessionToken } : {};
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) detail = `: ${body.error}`;
    } catch {
      /* ignore */
    }
    throw new Error(`${label} failed (${res.status})${detail}`);
  }
}

export async function getIceServers(): Promise<RTCIceServer[]> {
  const res = await fetch("/api/ice", { cache: "no-store" });
  if (!res.ok) return DEFAULT_STUN;
  const data = (await res.json()) as { iceServers?: RTCIceServer[] };
  return Array.isArray(data.iceServers) && data.iceServers.length > 0
    ? data.iceServers
    : DEFAULT_STUN;
}

export async function join(
  id: string,
  lat: number,
  lng: number,
  name: string,
  gender: string,
  location: string,
  mood = "",
): Promise<{ lat: number; lng: number; token: string }> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ id, lat, lng, name, gender, location, mood }),
  });
  await assertOk(res, "join");
  const data = (await res.json()) as {
    lat: number;
    lng: number;
    token: string;
  };
  if (data.token) setSessionToken(data.token);
  return { lat: data.lat, lng: data.lng, token: data.token };
}

export async function poll(id: string): Promise<PollResponse> {
  const tokenParam = _sessionToken
    ? `&token=${encodeURIComponent(_sessionToken)}`
    : "";
  const res = await fetch(
    `/api/poll?id=${encodeURIComponent(id)}${tokenParam}`,
    { cache: "no-store" },
  );
  await assertOk(res, "poll");
  return res.json();
}

export async function sendSignal(
  fromId: string,
  toId: string,
  type: SignalType,
  payload?: string,
): Promise<void> {
  const res = await fetch("/api/signal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ fromId, toId, type, payload }),
  });
  await assertOk(res, "signal");
}

export async function setBusy(id: string, busy: boolean): Promise<void> {
  const res = await fetch("/api/busy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ id, busy }),
  });
  await assertOk(res, "busy");
}

export async function reportPeer(
  reporterId: string,
  reportedId: string,
): Promise<void> {
  const res = await fetch("/api/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ reporterId, reportedId }),
  });
  await assertOk(res, "report");
}

export async function megaphone(id: string, text: string): Promise<void> {
  const res = await fetch("/api/megaphone", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ id, text }),
  });
  await assertOk(res, "megaphone");
}

export async function clearBroadcast(id: string): Promise<void> {
  const res = await fetch("/api/megaphone", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
    },
    body: JSON.stringify({ id }),
  });
  await assertOk(res, "clearBroadcast");
}

// Fire-and-forget leave that survives the tab closing.
export function leave(id: string): void {
  const body = JSON.stringify({ id, token: _sessionToken });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/leave", blob);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body,
      keepalive: true,
    });
  }
}
