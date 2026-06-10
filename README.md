# Pulse

A living globe of anonymous strangers. Every online user appears as a dot on a world map — tap one to connect for text chat or a video call. No accounts, no history, nothing stored.

## How it works

- **Coordination** runs on the server: live presence and WebRTC signaling, stored transiently in Postgres (via Prisma) and delivered by short HTTP polling. No WebSockets — they don't work reliably on Vercel serverless.
- **Chat and video are peer-to-peer** over WebRTC (data channel + media). They never touch the server, so messages and video are never seen or stored.
- The map is **Mapbox GL JS**. Each dot is placed 1–3 km from the user's real location, randomized fresh every session.

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Prisma 7** + PostgreSQL
- **Mapbox GL JS**
- **WebRTC** (STUN only — no TURN)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:

   - `DATABASE_URL` — a Postgres connection string ([Neon](https://neon.tech) works well)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — a [Mapbox access token](https://account.mapbox.com/access-tokens/)
   - `NEXT_PUBLIC_MAPBOX_STYLE` — optional Mapbox style URL (defaults to the project's custom style if unset)

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
2. In each window's DevTools → **Sensors**, set a different mock geolocation so the two dots land apart.
3. Tap one dot to connect, accept the request, chat, and start a video call.

> Connections use **STUN only** (no TURN), so some strict or corporate networks may not establish a media connection. That's a known limitation.

## Architecture

```
Browser A  ←—— WebRTC (chat + video) ——→  Browser B
    │                                         │
    └──── HTTP polling (/api/poll, /api/signal)
                      │
                  Next.js API
                      │
                  PostgreSQL
              (presence + signals)
```

| Endpoint | Purpose |
|----------|---------|
| `POST /api/join` | Register presence with privacy-offset coordinates |
| `GET /api/poll` | Heartbeat, peer list, signal drain |
| `POST /api/signal` | WebRTC signaling mailbox |
| `POST /api/leave` | Remove presence on tab close |

## Deployment

Deploy to [Vercel](https://vercel.com) with the same env vars from `.env.example` set in the project settings. Run `npx prisma db push` against your production database before going live.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). The in-app version badge (bottom-right of the map) opens the same changelog.

## License

Private project.
