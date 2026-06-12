"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Info,
  Loader2,
  ShieldCheck,
  UserPlus,
  Video,
  WifiOff,
  X,
} from "lucide-react";
import CreatedByCredit from "./components/CreatedByCredit";
import EntryGate from "./components/EntryGate";

const WorldMap = dynamic(() => import("./components/WorldMap"), { ssr: false });
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import ChatTabs from "./components/ChatTabs";
import VideoPanel from "./components/VideoPanel";
import BottomBar, { type GenderFilter } from "./components/BottomBar";
import MegaphoneBar from "./components/MegaphoneBar";
import ActivityFeed, { type ActivityFeedItem } from "./components/ActivityFeed";
import ChangelogPanel from "./components/ChangelogPanel";
import StatusToast from "./components/StatusToast";
import { canScreenShare } from "@/lib/mediaSupport";
import {
  clearBroadcast,
  getIceServers,
  join,
  leave,
  megaphone,
  poll,
  reportPeer,
  sendSignal,
  setBusy,
} from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { peerDisplayName } from "@/lib/peerDisplay";
import {
  type Gender,
  type Mood,
  type PeerDot,
  type SignalMsg,
} from "@/lib/types";

type VideoState = "none" | "requesting" | "incoming" | "active";

function formatPeerLabel(name: string, location: string): string {
  const n = peerDisplayName(name);
  return location ? `${n} from ${location}` : n;
}

interface ChatSession {
  peerId: string;
  peerName: string;
  peerGender: Gender;
  peerLocation: string;
  conn: "connecting" | "connected";
  peer: PeerSession;
  messages: ChatMessage[];
  unread: number;
  video: VideoState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  isTyping: boolean;
}

const REQUEST_TIMEOUT_MS = 30_000;
const BROADCAST_DISPLAY_MS = 5_000;

function cloneSessions(map: Map<string, ChatSession>) {
  return new Map(map);
}

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [sessions, setSessions] = useState<Map<string, ChatSession>>(
    () => new Map(),
  );
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [incomingPeerId, setIncomingPeerId] = useState<string | null>(null);
  const [incomingReceivedAt, setIncomingReceivedAt] = useState(0);
  const [requestingPeerId, setRequestingPeerId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [myLocation, setMyLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [myName, setMyName] = useState("");
  const [myGender, setMyGender] = useState<Gender>("other");
  const [myLocationLabel, setMyLocationLabel] = useState("");
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [connectionStatus, setConnectionStatus] = useState<
    "online" | "reconnecting"
  >("online");
  const [broadcastItems, setBroadcastItems] = useState<ActivityFeedItem[]>([]);
  const [myBroadcastText, setMyBroadcastText] = useState("");
  const [showPrivacyNote, setShowPrivacyNote] = useState(true);
  const [chatMinimized, setChatMinimized] = useState(false);

  const sessionsRef = useRef(sessions);
  const prevBroadcastRef = useRef<Map<string, string>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const activePeerIdRef = useRef(activePeerId);
  const incomingPeerIdRef = useRef(incomingPeerId);
  const requestingPeerIdRef = useRef(requestingPeerId);
  const peersRef = useRef(peers);
  const msgId = useRef(0);
  const requestTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const videoRequestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    activePeerIdRef.current = activePeerId;
  }, [activePeerId]);

  useEffect(() => {
    incomingPeerIdRef.current = incomingPeerId;
  }, [incomingPeerId]);

  useEffect(() => {
    requestingPeerIdRef.current = requestingPeerId;
  }, [requestingPeerId]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function pushBroadcastItem(item: ActivityFeedItem) {
    setBroadcastItems((prev) => [item, ...prev].slice(0, 5));
  }

  function processBroadcasts(newPeers: PeerDot[]) {
    const now = Date.now();
    const newItems: ActivityFeedItem[] = [];

    for (const peer of newPeers) {
      if (!peer.broadcastText) {
        prevBroadcastRef.current.set(peer.id, "");
        continue;
      }
      const prev = prevBroadcastRef.current.get(peer.id) ?? "";
      if (peer.broadcastText !== prev) {
        prevBroadcastRef.current.set(peer.id, peer.broadcastText);
        newItems.push({
          id: `${peer.id}-${now}`,
          name: peer.name,
          location: peer.location,
          text: peer.broadcastText,
          addedAt: now,
        });
      }
    }

    if (newItems.length > 0) {
      setBroadcastItems((prev) => [...newItems, ...prev].slice(0, 5));
    }
  }

  async function handleBroadcast(text: string) {
    await megaphone(sessionId, text);
    const now = Date.now();
    setMyBroadcastText(text);
    pushBroadcastItem({
      id: `${sessionId}-${now}`,
      name: myName,
      location: myLocationLabel,
      text,
      addedAt: now,
    });
  }

  async function handleClearBroadcast() {
    await clearBroadcast(sessionId);
    setMyBroadcastText("");
  }

  function handlePeerTyping(peerId: string) {
    updateSession(peerId, (s) => ({ ...s, isTyping: true }));
    const existing = typingTimers.current.get(peerId);
    if (existing) clearTimeout(existing);
    typingTimers.current.set(
      peerId,
      setTimeout(() => {
        typingTimers.current.delete(peerId);
        updateSession(peerId, (s) => ({ ...s, isTyping: false }));
      }, 2500),
    );
  }

  function mediaErrorMessage(err: unknown): string {
    const name =
      err instanceof DOMException
        ? err.name
        : err instanceof Error
          ? err.name
          : "";
    if (name === "NotAllowedError") return "Camera permission denied.";
    if (name === "NotFoundError") return "No camera found.";
    return "Camera unavailable.";
  }

  function clearVideoRequestTimer() {
    if (videoRequestTimer.current) {
      clearTimeout(videoRequestTimer.current);
      videoRequestTimer.current = null;
    }
  }

  function resolvePeer(peerId: string): {
    name: string;
    gender: Gender;
    location: string;
  } {
    const peer = peersRef.current.find((p) => p.id === peerId);
    return {
      name: peer?.name.trim() ?? "",
      gender: peer?.gender ?? "other",
      location: peer?.location ?? "",
    };
  }

  function updateSession(
    peerId: string,
    updater: (session: ChatSession) => ChatSession,
  ) {
    setSessions((prev) => {
      const session = prev.get(peerId);
      if (!session) return prev;
      const next = cloneSessions(prev);
      next.set(peerId, updater(session));
      return next;
    });
  }

  function pickNextActivePeerId(
    remaining: Map<string, ChatSession>,
    excludePeerId: string,
  ): string | null {
    for (const id of remaining.keys()) {
      if (id !== excludePeerId) return id;
    }
    return null;
  }

  const teardown = useCallback((peerId: string, message?: string) => {
    const timer = requestTimers.current.get(peerId);
    if (timer) {
      clearTimeout(timer);
      requestTimers.current.delete(peerId);
    }
    if (sessionsRef.current.get(peerId)?.video === "requesting") {
      clearVideoRequestTimer();
    }

    const session = sessionsRef.current.get(peerId);
    session?.peer.close();

    setSessions((prev) => {
      if (!prev.has(peerId)) return prev;
      const next = cloneSessions(prev);
      next.delete(peerId);
      return next;
    });

    setActivePeerId((current) => {
      if (current !== peerId) return current;
      const remaining = cloneSessions(sessionsRef.current);
      remaining.delete(peerId);
      return pickNextActivePeerId(remaining, peerId);
    });

    if (message) showNotice(message);
  }, []);

  function addMessage(
    peerId: string,
    mine: boolean,
    text: string,
    nonce: string,
  ) {
    const isActive = activePeerIdRef.current === peerId;
    setSessions((prev) => {
      const session = prev.get(peerId);
      if (!session) return prev;
      const next = cloneSessions(prev);
      next.set(peerId, {
        ...session,
        messages: [
          ...session.messages,
          { id: msgId.current++, mine, text, nonce, reactions: [] },
        ],
        unread: isActive ? session.unread : session.unread + 1,
      });
      return next;
    });
  }

  function addReaction(
    peerId: string,
    nonce: string,
    emoji: string,
    mine: boolean,
  ) {
    setSessions((prev) => {
      const session = prev.get(peerId);
      if (!session) return prev;
      const next = cloneSessions(prev);
      next.set(peerId, {
        ...session,
        messages: session.messages.map((m) => {
          if (m.nonce !== nonce) return m;
          if (m.reactions.some((r) => r.mine === mine && r.emoji === emoji)) {
            return m;
          }
          return {
            ...m,
            reactions: [...m.reactions, { emoji, mine }],
          };
        }),
      });
      return next;
    });
  }

  function removeReaction(
    peerId: string,
    nonce: string,
    emoji: string,
    mine: boolean,
  ) {
    setSessions((prev) => {
      const session = prev.get(peerId);
      if (!session) return prev;
      const next = cloneSessions(prev);
      next.set(peerId, {
        ...session,
        messages: session.messages.map((m) => {
          if (m.nonce !== nonce) return m;
          const idx = m.reactions.findIndex(
            (r) => r.mine === mine && r.emoji === emoji,
          );
          if (idx === -1) return m;
          const reactions = [...m.reactions];
          reactions.splice(idx, 1);
          return { ...m, reactions };
        }),
      });
      return next;
    });
  }

  function anySessionHasVideo(
    map: Map<string, ChatSession>,
    excludePeerId?: string,
  ): boolean {
    for (const [id, session] of map) {
      if (excludePeerId && id === excludePeerId) continue;
      if (session.video !== "none") return true;
    }
    return false;
  }

  function handleControl(peerId: string, ctrl: PeerControl) {
    const session = sessionsRef.current.get(peerId);
    if (!session) return;

    switch (ctrl) {
      case "video-request":
        if (anySessionHasVideo(sessionsRef.current)) {
          session.peer.sendControl("video-busy");
        } else if (session.video === "none") {
          updateSession(peerId, (s) => ({ ...s, video: "incoming" }));
        }
        break;
      case "video-accept":
        if (session.video === "requesting") {
          clearVideoRequestTimer();
          session.peer
            .startVideo()
            .then((stream) => {
              activateVideoSession(peerId, stream);
            })
            .catch((err: unknown) => {
              updateSession(peerId, (s) => ({ ...s, video: "none" }));
              session.peer.sendControl("video-end");
              showNotice(mediaErrorMessage(err));
            });
        }
        break;
      case "video-decline":
        if (session.video === "requesting") {
          clearVideoRequestTimer();
          updateSession(peerId, (s) => ({ ...s, video: "none" }));
          showNotice("Video declined.");
        }
        break;
      case "video-busy":
        if (session.video === "requesting") {
          clearVideoRequestTimer();
          updateSession(peerId, (s) => ({ ...s, video: "none" }));
          showNotice(
            `${peerDisplayName(session.peerName)} is already in another call`,
          );
        }
        break;
      case "video-end":
        clearVideoRequestTimer();
        session.peer.stopVideo();
        updateSession(peerId, (s) => ({
          ...s,
          localStream: null,
          remoteStream: null,
          video: "none",
          audioMuted: false,
          cameraEnabled: true,
          screenSharing: false,
        }));
        break;
    }
  }

  function startPeer(peerId: string, initiator: boolean) {
    const { name, gender, location } = resolvePeer(peerId);
    const ps = new PeerSession(
      initiator,
      {
        onSignal: (type: DescType, payload: string) => {
          void sendSignal(sessionId, peerId, type, payload);
        },
        onChat: (text, nonce) => addMessage(peerId, false, text, nonce),
        onReaction: (nonce, emoji) => addReaction(peerId, nonce, emoji, false),
        onUnreaction: (nonce, emoji) =>
          removeReaction(peerId, nonce, emoji, false),
        onControl: (ctrl) => handleControl(peerId, ctrl),
        onTyping: () => handlePeerTyping(peerId),
        onRemoteStream: (stream) => {
          updateSession(peerId, (s) => ({ ...s, remoteStream: stream }));
        },
        onConnectionState: (state) => {
          if (state === "disconnected") {
            teardown(peerId, `${peerDisplayName(name)} disconnected.`);
          } else if (state === "failed") {
            teardown(peerId, "Connection failed (network error).");
          }
        },
        onChannelOpen: () => {
          updateSession(peerId, (s) => ({ ...s, conn: "connected" }));
        },
        onScreenShareEnded: () => {
          updateSession(peerId, (s) => ({
            ...s,
            screenSharing: false,
            localStream: ps.getLocalStream(),
          }));
        },
      },
      iceServersRef.current,
    );

    const newSession: ChatSession = {
      peerId,
      peerName: name,
      peerGender: gender,
      peerLocation: location,
      conn: "connecting",
      peer: ps,
      messages: [],
      unread: 0,
      video: "none",
      localStream: null,
      remoteStream: null,
      audioMuted: false,
      cameraEnabled: true,
      screenSharing: false,
      isTyping: false,
    };

    setSessions((prev) => {
      const next = cloneSessions(prev);
      next.set(peerId, newSession);
      return next;
    });
    setActivePeerId(peerId);
  }

  function clearRequestTimer(peerId: string) {
    const timer = requestTimers.current.get(peerId);
    if (timer) {
      clearTimeout(timer);
      requestTimers.current.delete(peerId);
    }
  }

  function requestConnection(peerId: string) {
    if (sessionsRef.current.has(peerId)) return;
    if (requestingPeerIdRef.current === peerId) return;
    if (requestTimers.current.has(peerId)) return;

    setRequestingPeerId(peerId);
    void sendSignal(sessionId, peerId, "request");

    const timer = setTimeout(() => {
      requestTimers.current.delete(peerId);
      if (requestingPeerIdRef.current === peerId) {
        setRequestingPeerId(null);
      }
      void sendSignal(sessionId, peerId, "end");
      showNotice("No answer.");
    }, REQUEST_TIMEOUT_MS);
    requestTimers.current.set(peerId, timer);
  }

  function cancelRequest() {
    const peerId = requestingPeerIdRef.current;
    if (peerId) {
      clearRequestTimer(peerId);
      void sendSignal(sessionId, peerId, "end");
    }
    setRequestingPeerId(null);
  }

  function acceptIncoming() {
    const peerId = incomingPeerIdRef.current;
    if (!peerId) return;
    setIncomingPeerId(null);
    setIncomingReceivedAt(0);
    startPeer(peerId, false);
    void sendSignal(sessionId, peerId, "accept");
  }

  function declineIncoming() {
    const peerId = incomingPeerIdRef.current;
    if (!peerId) return;
    void sendSignal(sessionId, peerId, "decline");
    setIncomingPeerId(null);
    setIncomingReceivedAt(0);
  }

  function endConnection(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (session) {
      void sendSignal(sessionId, peerId, "end");
    }
    teardown(peerId);
  }

  function setActiveTab(peerId: string) {
    setActivePeerId(peerId);
    updateSession(peerId, (s) => ({ ...s, unread: 0 }));
  }

  function activateVideoSession(peerId: string, stream: MediaStream) {
    const session = sessionsRef.current.get(peerId);
    session?.peer.setCameraEnabled(false);
    updateSession(peerId, (s) => ({
      ...s,
      localStream: stream,
      video: "active",
      audioMuted: false,
      cameraEnabled: false,
    }));
  }

  function startVideoRequest(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session || session.video !== "none") return;
    if (anySessionHasVideo(sessionsRef.current, peerId)) {
      showNotice("End the other video call first.");
      return;
    }
    clearVideoRequestTimer();
    updateSession(peerId, (s) => ({ ...s, video: "requesting" }));
    session.peer.sendControl("video-request");
    videoRequestTimer.current = setTimeout(() => {
      videoRequestTimer.current = null;
      if (sessionsRef.current.get(peerId)?.video === "requesting") {
        cancelVideoRequest(peerId);
        showNotice("No answer.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelVideoRequest(peerId: string) {
    clearVideoRequestTimer();
    const session = sessionsRef.current.get(peerId);
    if (!session || session.video !== "requesting") return;
    session.peer.sendControl("video-end");
    updateSession(peerId, (s) => ({ ...s, video: "none" }));
  }

  function acceptVideo(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session) return;
    if (anySessionHasVideo(sessionsRef.current, peerId)) {
      session.peer.sendControl("video-decline");
      updateSession(peerId, (s) => ({ ...s, video: "none" }));
      showNotice("End the other video call first.");
      return;
    }
    session.peer
      .startVideo()
      .then((stream) => {
        activateVideoSession(peerId, stream);
        session.peer.sendControl("video-accept");
      })
      .catch((err: unknown) => {
        session.peer.sendControl("video-decline");
        updateSession(peerId, (s) => ({ ...s, video: "none" }));
        showNotice(mediaErrorMessage(err));
      });
  }

  function declineVideo(peerId: string) {
    clearVideoRequestTimer();
    const session = sessionsRef.current.get(peerId);
    session?.peer.sendControl("video-decline");
    updateSession(peerId, (s) => ({ ...s, video: "none" }));
  }

  function endVideo(peerId: string) {
    clearVideoRequestTimer();
    const session = sessionsRef.current.get(peerId);
    session?.peer.stopVideo();
    session?.peer.sendControl("video-end");
    updateSession(peerId, (s) => ({
      ...s,
      localStream: null,
      remoteStream: null,
      video: "none",
      audioMuted: false,
      cameraEnabled: true,
      screenSharing: false,
    }));
  }

  function startScreenShare(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session || session.video !== "active") return;
    if (!canScreenShare()) {
      showNotice("Screen sharing isn't supported on this device.");
      return;
    }
    session.peer
      .startScreenShare()
      .then((stream) => {
        updateSession(peerId, (s) => ({
          ...s,
          localStream: stream,
          screenSharing: true,
        }));
      })
      .catch(() => {
        showNotice("Couldn't start screen sharing.");
      });
  }

  function stopScreenShare(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session) return;
    void session.peer.stopScreenShare().then(() => {
      updateSession(peerId, (s) => ({
        ...s,
        localStream: session.peer.getLocalStream(),
        screenSharing: false,
      }));
    });
  }

  function toggleVideoMute(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session) return;
    const nextMuted = !session.audioMuted;
    session.peer.setAudioMuted(nextMuted);
    updateSession(peerId, (s) => ({ ...s, audioMuted: nextMuted }));
  }

  function toggleVideoCamera(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session) return;
    const nextEnabled = !session.cameraEnabled;
    session.peer.setCameraEnabled(nextEnabled);
    updateSession(peerId, (s) => ({ ...s, cameraEnabled: nextEnabled }));
  }

  function processSignal(sig: SignalMsg) {
    switch (sig.type) {
      case "request": {
        if (sessionsRef.current.has(sig.fromId)) {
          void sendSignal(sessionId, sig.fromId, "decline");
          break;
        }
        if (incomingPeerIdRef.current === sig.fromId) {
          break;
        }
        if (incomingPeerIdRef.current) {
          void sendSignal(sessionId, sig.fromId, "decline");
          break;
        }
        setIncomingPeerId(sig.fromId);
        setIncomingReceivedAt(Date.now());
        break;
      }
      case "accept": {
        if (requestingPeerIdRef.current === sig.fromId) {
          clearRequestTimer(sig.fromId);
          setRequestingPeerId(null);
          startPeer(sig.fromId, true);
        }
        break;
      }
      case "decline": {
        if (requestingPeerIdRef.current === sig.fromId) {
          clearRequestTimer(sig.fromId);
          setRequestingPeerId(null);
          showNotice("Request declined.");
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        const session = sessionsRef.current.get(sig.fromId);
        if (session) {
          void session.peer.handleSignal(
            sig.type as DescType,
            sig.payload ?? "",
          );
        }
        break;
      }
      case "end": {
        if (requestingPeerIdRef.current === sig.fromId) {
          clearRequestTimer(sig.fromId);
          setRequestingPeerId(null);
        }
        if (incomingPeerIdRef.current === sig.fromId) {
          setIncomingPeerId(null);
          setIncomingReceivedAt(0);
          showNotice("Request expired.");
        }
        if (sessionsRef.current.has(sig.fromId)) {
          const session = sessionsRef.current.get(sig.fromId);
          const name = peerDisplayName(
            session?.peerName ?? resolvePeer(sig.fromId).name,
          );
          teardown(sig.fromId, `${name} disconnected.`);
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  useEffect(() => {
    setSessions((prev) => {
      let changed = false;
      const next = cloneSessions(prev);
      for (const [peerId, session] of prev) {
        const peer = peers.find((p) => p.id === peerId);
        const name = peer?.name.trim();
        const gender = peer?.gender ?? session.peerGender;
        const location = peer?.location ?? session.peerLocation;
        if (
          (name && name !== session.peerName) ||
          gender !== session.peerGender ||
          location !== session.peerLocation
        ) {
          next.set(peerId, {
            ...session,
            peerName: name || session.peerName,
            peerGender: gender,
            peerLocation: location,
          });
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [peers]);

  useEffect(() => {
    if (phase !== "live") return;
    const interval = window.setInterval(() => {
      const cutoff = Date.now() - BROADCAST_DISPLAY_MS;
      setBroadcastItems((prev) =>
        prev.filter((item) => item.addedAt >= cutoff),
      );
    }, 500);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveFailures = 0;

    const tick = async () => {
      try {
        const data = await poll(sessionId);
        if (!active) return;
        consecutiveFailures = 0;
        setConnectionStatus("online");
        processBroadcasts(data.peers);
        setMyBroadcastText(data.myBroadcastText);
        setPeers(data.peers);
        for (const s of data.signals) processSignalRef.current(s);
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          setConnectionStatus("reconnecting");
        }
      }
      if (active) {
        const delay =
          consecutiveFailures >= 3
            ? Math.min(
                POLL_INTERVAL_MS * 2 ** (consecutiveFailures - 3),
                10_000,
              )
            : POLL_INTERVAL_MS;
        timer = setTimeout(tick, delay);
      }
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

  useEffect(() => {
    if (phase !== "live") return;
    const inVideo = [...sessions.values()].some((s) => s.video === "active");
    void setBusy(sessionId, inVideo).catch(() => {});
  }, [sessions, phase, sessionId]);

  useEffect(() => {
    if (!sessionId || phase !== "live") return;
    const onLeave = () => leave(sessionId);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [sessionId, phase]);

  async function handleReady(
    lat: number,
    lng: number,
    name: string,
    gender: Gender,
    location: string,
    mood: Mood,
  ) {
    setMyName(name);
    setMyGender(gender);
    setMyLocationLabel(location);
    iceServersRef.current = await getIceServers();
    const offset = await join(
      sessionId,
      lat,
      lng,
      name,
      gender,
      location,
      mood,
    );
    setMyLocation({ lat: offset.lat, lng: offset.lng });
    setPhase("live");
  }

  if (phase === "gate") {
    return <EntryGate onReady={handleReady} />;
  }

  const activeSession = activePeerId
    ? (sessions.get(activePeerId) ?? null)
    : null;
  const videoSession = [...sessions.values()].find((s) => s.video !== "none");

  const filteredPeers =
    genderFilter === "all"
      ? peers
      : peers.filter((p) => p.gender === genderFilter);

  const chatTabs = [...sessions.values()].map((session) => ({
    peerId: session.peerId,
    peerName: session.peerName,
    peerGender: session.peerGender,
    unread: session.unread,
    active: session.peerId === activePeerId,
  }));
  const showSidebarChat =
    chatTabs.length > 0 && videoSession?.video !== "active";

  return (
    <main className="fixed inset-0 overflow-hidden">
      {videoSession?.video !== "active" && <CreatedByCredit />}
      <WorldMap
        peers={filteredPeers}
        me={
          myLocation ? { ...myLocation, name: myName, gender: myGender } : null
        }
        myBroadcastText={myBroadcastText}
        onPeerClick={requestConnection}
      />

      {videoSession?.video !== "active" && (
        <MegaphoneBar
          activeBroadcast={myBroadcastText}
          onBroadcast={async (text) => {
            try {
              await handleBroadcast(text);
            } catch {
              showNotice("Couldn't send broadcast.");
              throw new Error("broadcast failed");
            }
          }}
          onClear={async () => {
            try {
              await handleClearBroadcast();
            } catch {
              showNotice("Couldn't delete broadcast.");
              throw new Error("clear broadcast failed");
            }
          }}
        />
      )}

      <ActivityFeed items={broadcastItems} />

      {showSidebarChat && (
        <div
          className={`absolute inset-y-0 right-0 transition-[width] duration-300 ease-in-out ${
            chatMinimized ? "z-40 w-12" : "z-[60] w-full max-w-lg"
          }`}
        >
          {activeSession && (
            <ChatPanel
              messages={activeSession.messages}
              peerName={formatPeerLabel(
                activeSession.peerName,
                activeSession.peerLocation,
              )}
              connected={activeSession.conn === "connected"}
              videoBusy={activeSession.video !== "none"}
              isTyping={activeSession.isTyping}
              minimized={chatMinimized}
              onToggleMinimize={() => setChatMinimized((m) => !m)}
              tabs={chatTabs}
              onTabSelect={setActiveTab}
              onSend={(text) => {
                const nonce = crypto.randomUUID();
                activeSession.peer.sendChat(text, nonce);
                addMessage(activeSession.peerId, true, text, nonce);
              }}
              onReact={(nonce, emoji) => {
                const hasMine = activeSession.messages
                  .find((m) => m.nonce === nonce)
                  ?.reactions.some((r) => r.mine && r.emoji === emoji);
                if (hasMine) {
                  activeSession.peer.sendUnreaction(nonce, emoji);
                  removeReaction(activeSession.peerId, nonce, emoji, true);
                } else {
                  activeSession.peer.sendReaction(nonce, emoji);
                  addReaction(activeSession.peerId, nonce, emoji, true);
                }
              }}
              onTyping={() => activeSession.peer.sendTyping()}
              onReport={() =>
                void reportPeer(sessionId, activeSession.peerId).catch(() =>
                  showNotice("Couldn't submit report."),
                )
              }
              onStartVideo={() => startVideoRequest(activeSession.peerId)}
              onEnd={() => endConnection(activeSession.peerId)}
            />
          )}
          {!chatMinimized && (
            <ChatTabs tabs={chatTabs} onSelect={setActiveTab} />
          )}
        </div>
      )}

      {showPrivacyNote && (
        <StatusToast
          position="bottom"
          width="22rem"
          zIndex={50}
          sidebarAware={
            showSidebarChat
              ? { show: true, minimized: chatMinimized }
              : undefined
          }
          role="status"
          innerClassName="items-center gap-2 px-3 py-2.5 text-xs text-[var(--text-secondary)]"
        >
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            Your pin is placed 1–3&nbsp;km from your real location for privacy.
          </span>
          <button
            type="button"
            onClick={() => setShowPrivacyNote(false)}
            aria-label="Dismiss privacy note"
            className="shrink-0 cursor-pointer rounded p-0.5 text-[var(--text-muted)] transition duration-200 hover:text-[var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </StatusToast>
      )}

      {connectionStatus === "reconnecting" && (
        <StatusToast position="top">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
          Reconnecting…
        </StatusToast>
      )}

      {notice && (
        <StatusToast position="top">
          <Info className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
          <span className="min-w-0 flex-1">{notice}</span>
        </StatusToast>
      )}

      {requestingPeerId && (
        <StatusToast position="top" innerClassName="gap-3">
          <UserPlus
            className="h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            Requesting connection with{" "}
            {peerDisplayName(resolvePeer(requestingPeerId).name)}…
          </span>
          <button
            onClick={cancelRequest}
            className="shrink-0 cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs transition duration-200 hover:bg-white/15"
          >
            Cancel
          </button>
        </StatusToast>
      )}

      {incomingPeerId && (
        <ConnectionPrompt
          key={incomingPeerId}
          title={`${formatPeerLabel(
            resolvePeer(incomingPeerId).name,
            resolvePeer(incomingPeerId).location,
          )} wants to connect`}
          acceptLabel="Accept"
          declineLabel="Decline"
          timeoutMs={REQUEST_TIMEOUT_MS}
          receivedAt={incomingReceivedAt}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {videoSession?.video === "requesting" && (
        <StatusToast position="top" innerClassName="gap-3">
          <Loader2
            className="h-4 w-4 shrink-0 animate-spin text-[var(--accent)]"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            Waiting for{" "}
            {formatPeerLabel(videoSession.peerName, videoSession.peerLocation)}{" "}
            to accept video call…
          </span>
          <button
            onClick={() => cancelVideoRequest(videoSession.peerId)}
            className="shrink-0 cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs transition duration-200 hover:bg-white/15"
          >
            Cancel
          </button>
        </StatusToast>
      )}

      {videoSession?.video === "incoming" && (
        <ConnectionPrompt
          audioVariant="video"
          title="Start video call?"
          subtitle={`${formatPeerLabel(videoSession.peerName, videoSession.peerLocation)} wants to start a video call.`}
          acceptLabel="Accept"
          declineLabel="Decline"
          icon={Video}
          onAccept={() => acceptVideo(videoSession.peerId)}
          onDecline={() => declineVideo(videoSession.peerId)}
        />
      )}

      {videoSession?.video === "active" && (
        <VideoPanel
          peerName={formatPeerLabel(
            videoSession.peerName,
            videoSession.peerLocation,
          )}
          localStream={videoSession.localStream}
          remoteStream={videoSession.remoteStream}
          audioMuted={videoSession.audioMuted}
          cameraEnabled={videoSession.cameraEnabled}
          screenSharing={videoSession.screenSharing}
          messages={videoSession.messages}
          connected={videoSession.conn === "connected"}
          isTyping={videoSession.isTyping}
          onSend={(text) => {
            const nonce = crypto.randomUUID();
            videoSession.peer.sendChat(text, nonce);
            addMessage(videoSession.peerId, true, text, nonce);
          }}
          onReact={(nonce, emoji) => {
            const hasMine = videoSession.messages
              .find((m) => m.nonce === nonce)
              ?.reactions.some((r) => r.mine && r.emoji === emoji);
            if (hasMine) {
              videoSession.peer.sendUnreaction(nonce, emoji);
              removeReaction(videoSession.peerId, nonce, emoji, true);
            } else {
              videoSession.peer.sendReaction(nonce, emoji);
              addReaction(videoSession.peerId, nonce, emoji, true);
            }
          }}
          onTyping={() => videoSession.peer.sendTyping()}
          onToggleMute={() => toggleVideoMute(videoSession.peerId)}
          onToggleCamera={() => toggleVideoCamera(videoSession.peerId)}
          onStartScreenShare={() => startScreenShare(videoSession.peerId)}
          onStopScreenShare={() => stopScreenShare(videoSession.peerId)}
          onEnd={() => endVideo(videoSession.peerId)}
        />
      )}

      {videoSession?.video !== "active" && !changelogOpen && (
        <BottomBar
          compact={chatTabs.length > 0}
          onlineCount={peers.length}
          onChangelogOpen={() => setChangelogOpen(true)}
          genderFilter={genderFilter}
          onGenderFilterChange={setGenderFilter}
        />
      )}

      <ChangelogPanel
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </main>
  );
}
