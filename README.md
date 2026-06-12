# Pulse

A living globe of anonymous strangers. Every online user appears as a dot on a world map — tap one to connect for text chat or a video call. No accounts, no history, nothing stored.

## How it works

- **Entry**: Before joining the map, you enter a display name and gender. The app requests browser location, reverse-geocodes it to a coarse label (e.g. `Manila, PH`), and places your dot 1–3 km from your real coordinates — randomized fresh every session.
- **Coordination** runs on the server: live presence and WebRTC signaling, stored transiently in Postgres (via Prisma) and delivered by short HTTP polling. No WebSockets — they don't work reliably on Vercel serverless.
- **Chat and video are peer-to-peer** over WebRTC (data channel + media). Messages, reactions, and video never touch the server.
- The map is **Mapbox GL JS** with a configurable custom basemap style. Peer dots are color-coded by gender; names appear on hover. Your own pin is labeled **Me**.

## Features

- **Multi-chat** — connect and chat with multiple strangers at once; switch between conversations via tabs with unread badges.
- **Text chat** — multiline messages, emoji picker, and peer-to-peer message reactions synced over the data channel.
- **Video calls** — one-to-one video with mute/camera toggles, camera off by default, in-call chat sidebar, and `video-busy` handling when a peer is already in another call.
- **Map filters** — filter visible dots by gender (All / Male / Female / Other) from the bottom bar.
- **Glass UI** — OLED-friendly palette, glass panels, Lucide icons, Geist Sans typography, and entrance animations (with `prefers-reduced-motion` support).

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **Prisma 7** + PostgreSQL
- **Mapbox GL JS**
- **WebRTC** (STUN only — no TURN)
- **Lucide React**, **emoji-picker-react**, **react-markdown**

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
2. In each window, enter a different name and gender, then allow location access.
3. In each window's DevTools → **Sensors**, set a different mock geolocation so the two dots land apart.
4. Tap one dot to connect, accept the request, chat (try emoji and reactions), and start a video call.

> Connections use **STUN only** (no TURN), so some strict or corporate networks may not establish a media connection. That's a known limitation.

## Architecture

```
Browser A  ←—— WebRTC (chat + video + reactions) ——→  Browser B
    │                                                    │
    └──── HTTP polling (/api/poll, /api/signal)
                      │
                  Next.js API
                      │
                  PostgreSQL
         (presence: coords, name, gender, location, busy)
              (signals: connection + WebRTC mailbox)
```

| Endpoint           | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `POST /api/join`   | Register presence with privacy-offset coordinates, name, gender, and location label |
| `GET /api/poll`    | Heartbeat, peer list, signal drain                                                  |
| `POST /api/signal` | WebRTC signaling mailbox                                                            |
| `POST /api/leave`  | Remove presence on tab close                                                        |

## Deployment

Deploy to [Vercel](https://vercel.com) with the same env vars from `.env.example` set in the project settings. Run `npx prisma db push` against your production database before going live.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). The in-app changelog opens from the **Changelog** button in the bottom bar.

## License

Private project.
