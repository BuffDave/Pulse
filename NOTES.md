# Pulse — Phase Notes

Short record of what changed across the four phases and why.

---

## Phase 1 — Make it run

**What was broken**

The app looked fine on the surface but failed end-to-end. Five coordination and WebRTC bugs blocked reliable use:

1. **Stale dots** — `/api/poll` heartbeated every presence row (`where: {}`), so offline users never expired.
2. **Chat never delivered** — `sendChat` sent `t: "msg"` but the receiver only handled `t: "chat"`.
3. **Stuck `busy` after end** — the `end` signal did not clear `busy` on either peer.
4. **Stuck `busy` on re-join** — join upsert did not reset `busy: false` after a crash.
5. **NAT connection failures** — ICE candidates flushed before `setRemoteDescription`, so `addIceCandidate` failed silently.

**How I found it**

Started from the reported symptom (dots lingering after tabs closed), then read the full coordination path: poll → presence reap, signal → busy flags, join upsert, and `lib/webrtc.ts` message/ICE handling. Traced each failure mode with two-browser testing in mind.

**How I fixed it**

- Poll heartbeat scoped to caller only (`where: { id }`).
- Chat type aligned to `"chat"`.
- `end` handled like `decline` for busy cleanup.
- Join update sets `busy: false`.
- ICE flush moved after `setRemoteDescription`.

Also shipped `CHANGELOG.md` + in-app `ChangelogPanel` (react-markdown, Turbopack raw-loader) and rewrote `README.md`. Released as **v1.0.0**.

---

## Phase 2 — Make it good

**What changed**

Full UI/UX pass toward a premium dark “glass” experience:

- **Design system** — OLED blue-black palette, emerald accent, `panel-glass`, CSS tokens, entrance animations (`fade-up`, `scale-in`, `slide-right`) with `prefers-reduced-motion`.
- **Typography** — Geist Sans globally (replacing default Arial).
- **Icons** — Lucide across entry gate, bottom bar, chat, prompts, video, changelog.
- **Entry gate** — Aurora background, glowing logo, glass card, shimmer CTA, locate spinner.
- **Map** — Gender-colored pulse rings, hover labels, red “Me” pin (SVG, not emoji).
- **Chat** — Slide-in glass panel, gradient bubbles, icon controls, glass tabs.
- **Modals / video** — Blurred backdrops, scale-in cards, unified glass control bar.

**Thinking behind it**

The original UI was utilitarian zinc + emerald with no motion or depth — fine for a prototype, not something you’d show strangers. Goal: immersive map-first product (Discord/Telegram meets Mapbox) without changing core flows. Reused existing layout (map background, right chat sidebar, bottom pill bar) and layered polish rather than a full re-architecture. Released as **v1.4.0**.

---

## Phase 3 — Make it secure (ship-ready)

**Issues found (ranked)**

| Priority | Issue | Risk |
| --- | --- | --- |
| P0 | 5/8 API routes had no rate limiting | Abuse, cost (especially `/api/ice` TURN minting) |
| P0 | `/api/ice` issued 24h TURN creds to anyone | Quota/billing abuse if leaked |
| P1 | No security headers | Clickjacking, MIME sniffing |
| P1 | Inconsistent ID validation on poll/leave/signal | Odd inputs, harder to reason about limits |
| P1 | Report table allowed duplicate spam | DB noise, noisy moderation |
| P2 | No SEO metadata / OG / sitemap | Blank link previews |
| P2 | Mapbox bundled on entry gate | Slow first paint |
| P2 | Changelog in main bundle | Unnecessary weight |
| Deferred | Session UUID = bearer token (IDOR) | Anonymous design trade-off; needs proof-of-possession later |
| Deferred | Full CSP | Mapbox + WebRTC need careful allow-lists |

**What I fixed (v1.7.0)**

- Security headers, `poweredByHeader: false`, lucide `optimizePackageImports`.
- Rate limits on all 8 routes via `middleware.ts` → later `proxy.ts`.
- 8–64 char ID bounds on poll, leave, signal.
- TURN TTL 24h → 1h.
- `@@unique([reporterId, reportedId])` + report upsert.
- SEO: `metadataBase`, Open Graph, Twitter card, `robots.ts`, `sitemap.ts`, build-time OG image.
- Performance: dynamic `WorldMap` import, changelog isolated in `ChangelogPanel`.

A follow-up prod audit (v1.8.0) closed remaining blockers: session token auth, Upstash Redis rate limiting, `/api/health`, error boundaries, API try/catch, CSP, 30-day report TTL, parallel poll queries, Signal indexes, connection timer clock-skew fix, chat minimize, privacy offset toast.

---

## Phase 4 — Make it a product

**What I built**

Product depth and launch readiness on top of the stable core:

- **Megaphone** — map-wide broadcasts, activity feed, map badges, notification sound (v1.6).
- **Connection UX** — request/video prompt sounds, timeout bars, tab-background timer fixes.
- **Richer sessions** — multi-chat, mood on entry, typing indicators, screen share, Cloudflare TURN, PWA, report user, reconnect banner (v1.5–1.6).
- **Legal & compliance (v1.9)** — `/privacy` and `/terms` (first-person markdown, Pulse-accurate data practices), required 18+ checkbox on entry, shared `LegalPage`, `buildPageMetadata()` for legal SEO, sitemap entries.
- **Prod polish** — dismissible privacy note (“pin is 1–3 km offset”), chat sidebar minimize, README brought current through v1.9.

**Why**

Phase 1–3 made Pulse work, look good, and resist basic abuse. Phase 4 is what makes it something you could put in front of real strangers: broadcasts and multi-session chat add personality; legal pages and an 18+ gate are non-negotiable for anonymous video chat; session tokens and observability (from v1.8) close the gap between “demo” and “deployed.”

**What I’d do next with more time**

1. **Observability** — Sentry (or similar) on client + API; structured logging; alerts on `/api/health` failures.
2. **Moderation** — Admin view for `Report` rows; optional auto-hide after N flags; rate-limit reports per session more aggressively.
3. **Security hardening** — Nonce-based CSP (drop `'unsafe-inline'` on scripts); require session token on `/api/ice`; move poll token off query strings to avoid access-log leakage.
4. **Reliability** — Neon always-on or keepalive cron; E2E tests for join → connect → chat → video; split `page.tsx` into hooks/modules.
5. **Product** — Optional interest tags or region filters; ephemeral “rooms” without accounts; better mobile landscape video layout.
