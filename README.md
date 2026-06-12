# Pulse

A living globe of anonymous strangers. Every online user appears as a dot on a world map — tap one to connect for text chat or a video call. No accounts, no history, nothing stored. **18+ only.**

## How it works

- **Entry**: Before joining the map, you enter a display name and gender, optionally pick a mood, and confirm you are 18+ and agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy). The app requests browser location, reverse-geocodes it to a coarse label (e.g. `Manila, PH`), and places your dot 1–3 km from your real coordinates — randomized fresh every session.
- **Coordination** runs on the server: live presence and WebRTC signaling, stored transiently in Postgres (via Prisma) and delivered by short HTTP polling. No WebSockets — they don't work reliably on Vercel serverless.
- **Session auth**: Each presence row gets a proof-of-possession token; mutating API calls verify `X-Session-Token` (or the poll `token` query param) before acting on a session ID.
- **Chat and video are peer-to-peer** over WebRTC (data channel + media). Messages, reactions, typing state, and video never touch the server.
- **ICE / NAT traversal**: When configured, `/api/ice` issues short-lived [Cloudflare TURN](https://developers.cloudflare.com/calls/turn/) credentials; otherwise clients fall back to Google STUN.
- The map is **Mapbox GL JS** with a configurable custom basemap style. Peer dots are color-coded by gender; names and mood appear on hover. Your own pin is labeled **Me**.

## Features

### Map & presence

- **Gender filter** — show All, Male, Female, or Other from the bottom bar.
- **Megaphone** — broadcast a short message (up to 100 characters) to everyone on the map; active broadcasts appear as pills above dots with an activity feed on the left.
- **Privacy offset note** — dismissible toast explains that your pin is placed 1–3 km from your real location.

### Chat

- **Multi-chat** — connect and chat with multiple strangers at once; switch between conversations via tabs with unread badges.
- **Minimize / expand** — collapse the chat sidebar to a compact strip with peer tabs and unread badges.
- **Text chat** — multiline messages, emoji picker, peer-to-peer message reactions, and typing indicators synced over the data channel.
- **Safety reminders** — empty chat state warns against sharing PII and encourages kindness.
- **Report user** — flag button in the chat header posts an anonymous report for moderation review.

### Video

- **Video calls** — one-to-one video with mute/camera toggles, camera off by default, in-call chat sidebar, and `video-busy` handling when a peer is already in another call.
- **Screen sharing** — share your screen during a call; remote video switches to the shared track and reverts when sharing ends.
- **Connection sounds** — distinct audio cues for incoming chat requests, video requests, and megaphone broadcasts.

### UI & polish

- **Glass UI** — OLED-friendly palette, glass panels, Lucide icons, Geist Sans typography, and entrance animations (with `prefers-reduced-motion` support).
- **PWA** — web app manifest, theme colors, and generated icons for add-to-home-screen.
- **Reconnect banner** — poll failures trigger exponential backoff and a top-of-screen *Reconnecting…* notice.
- **Legal pages** — `/privacy` and `/terms` with markdown content, SEO metadata, and cross-links.
- **In-app changelog** — opens from the **Changelog** button in the bottom bar.

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL
- **Mapbox GL JS**
- **WebRTC** — Cloudflare TURN (optional) + Google STUN fallback
- **Upstash Redis** — distributed rate limiting in production (in-memory fallback for local dev)
- **Lucide React**, **emoji-picker-react**, **react-markdown**

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:

   | Variable | Required | Purpose |
   | --- | --- | --- |
   | `DATABASE_URL` | Yes | Postgres connection string ([Neon](https://neon.tech) works well; use `sslmode=verify-full`) |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | [Mapbox access token](https://account.mapbox.com/access-tokens/) |
   | `NEXT_PUBLIC_MAPBOX_STYLE` | No | Mapbox style URL (defaults to the project's custom style if unset) |
   | `NEXT_PUBLIC_APP_URL` | No | Production URL for SEO, sitemap, and Open Graph (defaults to the deployed URL) |
   | `CLOUDFLARE_TURN_KEY_ID` | No | Cloudflare Calls TURN key ID for relay credentials |
   | `CLOUDFLARE_TURN_API_TOKEN` | No | Cloudflare Calls API token paired with the TURN key |
   | `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL for distributed rate limiting |
   | `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token |

3. Create the database tables:

   ```bash
   npx prisma db push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Testing with two users

Pulse connects two strangers — you need two participants to try it end-to-end.

1. Open the app in **two separate browser windows** (e.g. a normal window + an incognito/private window, or two different browsers).
2. In each window, enter a different name and gender, confirm the 18+ checkbox, then allow location access.
3. In each window's DevTools → **Sensors**, set a different mock geolocation so the two dots land apart.
4. Tap one dot to connect, accept the request, chat (try emoji, reactions, and typing indicators), broadcast a megaphone message, and start a video call (try screen sharing).

> Without Cloudflare TURN configured, connections use **STUN only**, so some strict or corporate networks may not establish a media connection. Set the Cloudflare env vars for relay support in production.

## Architecture

```
Browser A  ←—— WebRTC (chat + video + reactions + typing) ——→  Browser B
    │                                                           │
    └──── HTTP polling (/api/poll, /api/signal) + session token
                      │
                  Next.js API  ←—— proxy.ts rate limiting
                      │
                  PostgreSQL
         (presence: coords, name, gender, location, mood, busy, broadcast)
              (signals: connection + WebRTC mailbox)
              (reports: anonymous moderation flags)
```

| Endpoint | Purpose |
| --- | --- |
| `POST /api/join` | Register presence with privacy-offset coordinates, name, gender, location, and mood; returns session token |
| `GET /api/poll` | Heartbeat, peer list, signal drain, broadcast state |
| `POST /api/signal` | WebRTC signaling mailbox |
| `POST /api/leave` | Remove presence on tab close |
| `GET /api/ice` | Short-lived TURN credentials (Cloudflare) or STUN fallback |
| `POST /api/busy` | Set `busy` while in an active video call |
| `POST /api/megaphone` | Create or delete a map-wide broadcast message |
| `POST /api/report` | Submit an anonymous user report |
| `GET /api/health` | Postgres probe for uptime monitors |

## Deployment

Deploy to [Vercel](https://vercel.com) with the env vars from `.env.example` set in the project settings. Run `npx prisma db push` against your production database before going live.

For production, configure:

- **`CLOUDFLARE_TURN_*`** — relay support for users behind restrictive NATs
- **`UPSTASH_REDIS_*`** — distributed rate limiting across serverless instances
- **`NEXT_PUBLIC_APP_URL`** — correct canonical URL for SEO and link previews

Point uptime monitors at `GET /api/health`.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). The in-app changelog opens from the **Changelog** button in the bottom bar.

## License

Private project.
