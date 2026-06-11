# Changelog

All notable changes to Pulse are documented here.

## [1.7.0]

### Added

- **Megaphone emoji picker**: Smile button in the expanded megaphone bar opens `emoji-picker-react` below the input; emojis append to broadcast text (capped at 100 characters).
- **Activity feed location**: Broadcast notifications show peer location inline (e.g. *Stranger from California, US*).
- **SEO metadata**: `metadataBase`, Open Graph, Twitter card, canonical URL, and robots directives in the root layout.
- **Discoverability**: `app/robots.ts` and `app/sitemap.ts` for crawlers; `NEXT_PUBLIC_APP_URL` env var for production URL.
- **OG image**: Build-time script generates `public/opengraph-image.png` (1200×630) for link previews.
- **Security headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` on all routes via `next.config.ts`.
- **Full API rate limiting**: Proxy throttles all eight API routes per IP (`/api/poll`, `/api/ice`, `/api/megaphone`, `/api/busy`, `/api/leave` added to existing join/signal/report limits).
- **Report deduplication**: `@@unique([reporterId, reportedId])` on `Report`; `/api/report` upserts so repeat reports from the same user are idempotent.

### Changed

- **Activity feed sizing**: Wider cards (19rem), larger name and message text, and more padding for readability.
- **Megaphone picker placement**: Emoji picker opens below the bar (not above) so it is not clipped by the top of the screen on mobile.
- **TURN credential TTL**: Cloudflare ICE credentials reduced from 24 hours to 1 hour to limit abuse if leaked.
- **Middleware → proxy**: Rate limiting moved from deprecated `middleware.ts` to `proxy.ts` (Next.js 16 convention).
- **Bundle performance**: `WorldMap` is dynamically imported so Mapbox GL does not load on the entry gate; changelog markdown is bundled only with `ChangelogPanel`.
- **Build pipeline**: Icon and OG image generation run before `next build`; `optimizePackageImports` for `lucide-react`.
- **`.env.example`**: Documents `NEXT_PUBLIC_APP_URL` and recommends `sslmode=verify-full` for Postgres.

### Fixed

- **Inconsistent API validation**: Poll, leave, and signal routes now enforce the same 8–64 character session ID bounds as join and megaphone.

## [1.6.0]

### Added

- **Megaphone**: Top-center collapsible bar to broadcast a short message (up to 100 characters) to everyone on the map; one active broadcast per user until deleted.
- **Map broadcast badges**: Active broadcasts appear as accent pills above peer dots (and your pin); on hover, the name/gender/mood label slides in below the broadcast.
- **Megaphone activity feed**: Center-left stack of the latest broadcast notifications with slide-in and fade-out; plays a distinct notification ding when a new message arrives.
- **Megaphone API**: `POST` and `DELETE` `/api/megaphone` with one-at-a-time enforcement; poll returns `broadcastText` on peers and `myBroadcastText` for the caller.
- **Connection prompt sounds**: Ascending sine ping on incoming chat requests, repeating every 3s until accept, decline, or timeout.
- **Video call prompt sound**: Double-pulse ring tone (distinct from chat requests) on incoming video call prompts.
- **Broadcast notification sound**: Single 880 Hz ding in the activity feed when a peer broadcasts (separate from connection sounds).

### Changed

- **Connection prompt timer**: Countdown reflects time elapsed since the request was sent (including while the tab is in the background); progress bar driven by `requestAnimationFrame` for smooth shrinking.
- **Activity feed layout**: Multiple broadcasts stack vertically with subtle depth instead of overlapping.
- **Hovered map markers**: Broadcast and name badges rise above neighboring dots via marker `z-index`; slightly increased gap between broadcast and name pills on hover.

### Fixed

- **Connection timer after tab switch**: Returning to a backgrounded tab no longer resets the timeout bar to full — elapsed time is preserved from the signal `createdAt` timestamp.

## [1.5.0]

### Added

- **Cloudflare TURN**: `/api/ice` issues short-lived relay credentials when `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` are set; falls back to Google STUN otherwise.
- **Mood on entry**: Optional mood picker on the entry gate (Lucide icons in a two-column card); mood is stored on presence and shown in map hover labels and tooltips.
- **Typing indicators**: Peer typing state syncs over the WebRTC data channel; shown as *typing…* in the chat panel.
- **Connection countdown**: Outgoing connection and video requests show an animated timeout bar on the prompt modal.
- **Screen sharing**: Share your screen during a video call; remote video switches to the shared track and reverts when sharing ends.
- **Report user**: Flag button in the chat header posts an anonymous report (`/api/report`) for moderation review.
- **Rate limiting**: Middleware throttles `/api/join`, `/api/signal`, and `/api/report` per IP (in-memory; Redis noted for multi-instance production).
- **Video busy API**: `/api/busy` lets clients set `busy` while in an active video call so peers see accurate availability.
- **Reconnect banner**: Poll failures trigger exponential backoff and a top-of-screen *Reconnecting…* notice; join and signal calls surface HTTP errors instead of failing silently.
- **PWA**: Web app manifest, theme colors, and generated 192/512 icons for add-to-home-screen.
- **Privacy warning**: Empty chat state reminds users not to share phone numbers, addresses, passwords, or other private info.
- **Created-by credit**: Footer credit on the map view, hidden during an active video call.

### Changed

- **Your map pin**: Client uses the privacy-offset coordinates returned by `/api/join` so your dot matches the server-stored position.
- **Entry gate layout**: Name and gender on the left, mood grid on the right; mood buttons use Lucide icons instead of emoji.
- **Bottom bar (mobile)**: When a chat is open, viewports below 1260px show a bottom-left burger menu (changelog, online count, gender filter) instead of the full pill bar.
- **Chat tabs**: Active tab shows a white gender icon and white peer name instead of a colored dot.
- **Map gender icons**: Badge icons use gender colors (blue / pink / gray) via shared `genderColor()` tokens.
- **Reaction UI**: Message reaction chips and hover/compose emoji pickers styled in `globals.css` for consistent glass panels and accent highlights.
- **Chat panel**: Safe-area padding for notched phones; report and typing UI integrated into the header and message list.

### Fixed

- **Me-pin offset drift**: Joining no longer leaves your pin at raw GPS while peers see the offset position — both sides now use the same offset coords from the join response.

## [1.4.0]

### Added

- **Design system**: CSS tokens for a blue-black OLED palette, emerald accent, glass panels, and entrance animations (`fade-up`, `scale-in`, `slide-right`) with `prefers-reduced-motion` support.
- **Lucide icons**: Consistent SVG icons across the entry gate, bottom bar, chat panel, connection prompts, changelog, video controls, and status toasts (`lucide-react`).
- **Entry gate redesign**: Animated aurora background, glowing logo, glassmorphism card, shimmer CTA, and loading spinner while locating.
- **Connection prompt icons**: Contextual Lucide icon above the title (`UserPlus` for chat, `Video` for video requests).
- **Map marker polish**: Pulsing peer dots with gender-colored rings; name and gender labels appear on hover only.
- **Your map pin**: Red SVG location pin (replacing the emoji); label shows **Me** instead of your entered name.

### Changed

- **Typography**: Geist Sans applied globally via `layout.tsx` and CSS variables (replacing Arial).
- **Chat panel**: Gradient message bubbles, icon send/emoji/video/end buttons, slide-in animation, and glass-styled header.
- **Bottom bar**: Glass pill with Lucide icons, live pulse dot beside online count, animated filter dropdown.
- **Chat tabs**: Glass pills with staggered fade-in and accent glow on the active tab.
- **Modals and toasts**: Glass treatment, scale-in animations, and Lucide icons on changelog and status banners.
- **Video panel**: Unified glass control bar, larger PiP with ring border, spinner while waiting for remote video.

### Fixed

- **Reaction picker on peer messages**: Quick-reaction bar now renders via a React portal to `document.body`, so `backdrop-filter` and slide-in `transform` on the chat panel no longer trap `fixed` positioning off-screen.

## [1.3.0]

### Added

- **Video call controls**: Mute, camera toggle, and end-call buttons in the video panel; local PiP shows muted and camera-off badges.
- **Video call chat**: Full-screen two-column layout — video on the left, embedded chat on the right — reusing the same session messages as the sidebar.
- **Video request timeout**: Outgoing video requests time out after 30s with a cancel button, matching connection requests.
- **Camera off by default**: Joining a video call starts with the camera disabled; mic stays on. Users enable video with the camera toggle.

### Changed

- **Video panel layout**: Centered content up to 1340px wide with inner padding, rounded video frame, and orientation-aware stacking (portrait vs landscape).
- **Video framing**: Remote video uses `object-contain` so feeds are not cropped; aspect ratio adapts to device orientation.
- **Embedded chat width**: In-call chat matches the standalone panel width (`max-w-md`).
- **Media errors**: `getUserMedia` failures distinguish permission denied, no camera, and generic errors.

### Fixed

- **Reaction picker on own messages**: Quick-reaction bar aligns to the right edge of your bubbles instead of using a fixed width offset.
- **Video track toggles**: Mic and camera can be muted/disabled without SDP renegotiation via `track.enabled`.

## [1.2.0]

### Added

- **Emoji picker in chat**: Compose bar includes an emoji button with `emoji-picker-react` (native emoji style, dark theme).
- **Multiline messages**: Chat input is a textarea; Enter sends, Shift+Enter adds a new line.
- **Message reactions**: Hover a message to open a quick-reaction bar; reactions sync peer-to-peer over the WebRTC data channel.
- **Reaction pills**: Reactions appear below messages with counts; tap your own pill to remove it.

### Changed

- **Chat transport**: Messages carry a `nonce` so reactions can target the correct bubble on both sides.
- **Reaction picker UX**: Fixed positioning with smart above/below flip near the top of the scroll area; 250ms hover delay so the bar stays open while moving to it.

### Fixed

- **Emoji picker scrollbar**: Dark scrollbar styling on the picker body to match the changelog panel.
- **Modal backdrop vs bottom bar**: Connection prompts now sit above the bottom bar (`z-40`); the bottom bar is hidden while the changelog is open so overlays cover the full screen.

## [1.1.0]

### Added

- **Custom Mapbox style**: Map basemap is configurable via `NEXT_PUBLIC_MAPBOX_STYLE`, with a project default style fallback.
- **Name and gender on entry**: Users enter a display name and select a gender before joining the map.
- **Named map markers**: Peer dots show name and a gender SVG icon above the dot, with gender-based colors (blue / pink / gray).
- **Peer name in chat**: The chat panel header shows the connected peer's name instead of a generic label.
- **Multi-chat**: Connect and chat with multiple strangers at once; each conversation runs its own WebRTC session.
- **Chat tabs**: Switch between active chats via tabs just outside the chat panel; unread badges on inactive tabs.
- **Location labels**: Reverse-geocoded state and country (e.g. `Dave from Manila, PH`) shown in chat headers and connection prompts.
- **Bottom tab bar**: Centered bar at the bottom with Changelog (left), online count (center), and gender filter dropdown (right).
- **Gender filter**: Filter map dots to show All, Male, Female, or Other only.
- **Video call controls**: `video-busy` signal when a peer is already in another video call, with a named toast.

### Changed

- **Changelog trigger**: Moved from top-left version pill into the bottom tab bar.
- **Gender icons**: Replaced emoji with SVG icons on the entry gate and map markers.
- **Marker colors**: Dots are colored strictly by gender (no random per-user colors); Other uses neutral gray.
- **Toast placement**: All notices and status banners (including video-call waiting) appear at the top center.
- **Peer names in copy**: Disconnect, video, and connection messages use the peer's name instead of "stranger".
- **Video UI**: Renamed "Video" to "Video call" and "End video" to "End call"; video prompts include location labels.
- **Video panel**: Responsive picture-in-picture that follows the camera aspect ratio; peer name overlay during calls.
- **Bottom bar**: Hidden during an active video call; three equal-width sections; positioned higher from the screen edge.

### Fixed

- **Multi-chat blocked by busy flag**: Server no longer auto-declines requests to busy peers or sets `busy` on accept, allowing simultaneous connections.
- **Video dropdown clipped**: Gender filter menu was hidden by `overflow-hidden` on the bottom bar pill.
- **One video at a time**: Receiving a video request while already in a call now replies with `video-busy` instead of stacking prompts.

## [1.0.0]

### Fixed

- **Stale dots on the map**: The poll heartbeat was refreshing `lastSeen` for every presence row instead of only the caller, so offline users never expired and dots lingered long after tabs closed.
- **Chat messages never delivered**: The WebRTC data channel sent messages with `t: "msg"` but the receiver only handled `t: "chat"`, so peer-to-peer text was silently dropped.
- **Users stuck as busy after ending a call**: The `end` signal did not clear the `busy` flag on either peer, leaving them unconnectable until their row expired.
- **Re-join could not clear a stuck busy flag**: Joining again did not reset `busy: false`, so a crashed mid-call session could block new connections indefinitely.
- **WebRTC connections failing behind NAT**: ICE candidates were flushed before `setRemoteDescription`, causing `addIceCandidate` to fail silently and leaving connections stuck on "Connecting...".
