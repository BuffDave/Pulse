# Privacy Policy

**Last updated:** June 12, 2026

Pulse is an anonymous real-time connection app I operate. This Privacy Policy explains what information is handled when you use Pulse and how I treat it.

Pulse is intended for users **18 years of age or older** only. I do not knowingly collect information from anyone under 18.

## What Pulse Is

Pulse lets you appear on a world map as an anonymous dot and connect with other online users for text chat or video calls. There are no accounts and no persistent profiles. When you close your browser tab, your session ends.

## Information I Handle

### Data stored on my servers (temporary session data)

While you are actively using Pulse, my coordination servers temporarily store:

- A randomly generated **session ID** and a secret session token used to authenticate your requests
- Your chosen **display name**, **gender**, and optional **mood**
- **Privacy-offset map coordinates** (your dot is placed 1–3 km from your real location; your exact GPS coordinates are never stored)
- A coarse **location label** derived from your coordinates (for example, "California, US")
- **Megaphone** broadcast text, if you send one
- **Activity timestamps** (such as last seen) used to show you on the map and clean up stale sessions
- **WebRTC signaling messages** (connection requests, accept/decline, and technical handshake data) delivered through a short-lived mailbox

This data exists only for the duration of your session. When you leave or your session becomes stale, presence and signaling data is deleted.

### Data I do not store on my servers

- Your **exact GPS coordinates** — only privacy-offset coordinates are stored
- **Chat messages** — text chat travels peer-to-peer over WebRTC and is never sent to or stored on my servers
- **Video and audio** — media streams are peer-to-peer and are never recorded or stored by Pulse
- **Message reactions** — synced directly between peers

### Abuse reports

If you report another user, I store the reporter's session ID, the reported user's session ID, and a timestamp. This is used to help prevent repeat abuse. Report records may persist after a session ends.

## How I Use Information

I use session data solely to:

- Place and update your dot on the map
- Deliver connection requests and WebRTC signaling between users
- Show optional profile details (name, gender, mood, location label) to other users
- Operate the megaphone broadcast feature
- Maintain service reliability and enforce rate limits
- Process abuse reports

I do not sell your information. I do not use it for advertising or behavioral profiling.

## Third-Party Services

Pulse relies on the following third parties to operate:

- **Mapbox** — map tiles and client-side reverse geocoding (your browser sends coordinates to Mapbox to resolve a location label)
- **Cloudflare** — WebRTC TURN/STUN servers to help establish peer connections when direct connectivity is not possible
- **Hosting and database providers** (including Vercel and PostgreSQL) — to run the coordination API and store transient session data

These providers process data according to their own privacy policies. Peer-to-peer chat and video do not pass through my database.

## Cookies and Local Storage

Pulse does not use tracking cookies. Your session token is kept in memory in your browser tab only and is sent with API requests to authenticate your session. I do not use localStorage or sessionStorage for authentication.

## Data Retention

Presence and signaling data is deleted when you leave, when your session times out, or after signals are delivered. Abuse report records may be retained for a limited period to support safety measures.

## Your Choices

- You can stop using Pulse at any time by closing your browser tab, which ends your session.
- You can decline location access, but Pulse requires location to place your dot on the map.
- You can report users who violate my [Terms of Service](/terms).

## Children

Pulse is not directed at anyone under 18. If you believe a minor is using the service, please contact me at [arinodavejoshua@gmail.com](mailto:arinodavejoshua@gmail.com).

## Changes to This Policy

I may update this Privacy Policy from time to time. The "Last updated" date at the top will reflect the latest version. Continued use of Pulse after changes constitutes acceptance of the updated policy.

## Contact

For privacy questions or concerns, contact me at [arinodavejoshua@gmail.com](mailto:arinodavejoshua@gmail.com).
