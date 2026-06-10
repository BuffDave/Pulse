# Changelog

All notable changes to Pulse are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
