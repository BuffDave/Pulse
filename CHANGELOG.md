# Changelog

All notable changes to Pulse are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-06-10

### Fixed

- **Stale dots on the map** — The poll heartbeat was refreshing `lastSeen` for every presence row instead of only the caller, so offline users never expired and dots lingered long after tabs closed.
- **Chat messages never delivered** — The WebRTC data channel sent messages with `t: "msg"` but the receiver only handled `t: "chat"`, so peer-to-peer text was silently dropped.
- **Users stuck as busy after ending a call** — The `end` signal did not clear the `busy` flag on either peer, leaving them unconnectable until their row expired.
- **Re-join could not clear a stuck busy flag** — Joining again did not reset `busy: false`, so a crashed mid-call session could block new connections indefinitely.
- **WebRTC connections failing behind NAT** — ICE candidates were flushed before `setRemoteDescription`, causing `addIceCandidate` to fail silently and leaving connections stuck on "Connecting…".
