"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
import WorldMap from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import ChatTabs from "./components/ChatTabs";
import VideoPanel from "./components/VideoPanel";
import BottomBar, { type GenderFilter } from "./components/BottomBar";
import ChangelogPanel from "./components/ChangelogPanel";
import changelogContent from "../CHANGELOG.md";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { peerDisplayName } from "@/lib/peerDisplay";
import { type Gender, type PeerDot, type SignalMsg } from "@/lib/types";

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
}

const REQUEST_TIMEOUT_MS = 30_000;

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

  const sessionsRef = useRef(sessions);
  const activePeerIdRef = useRef(activePeerId);
  const incomingPeerIdRef = useRef(incomingPeerId);
  const requestingPeerIdRef = useRef(requestingPeerId);
  const peersRef = useRef(peers);
  const msgId = useRef(0);
  const requestTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

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

  function addMessage(peerId: string, mine: boolean, text: string) {
    const isActive = activePeerIdRef.current === peerId;
    setSessions((prev) => {
      const session = prev.get(peerId);
      if (!session) return prev;
      const next = cloneSessions(prev);
      next.set(peerId, {
        ...session,
        messages: [...session.messages, { id: msgId.current++, mine, text }],
        unread: isActive ? session.unread : session.unread + 1,
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
          session.peer
            .startVideo()
            .then((stream) => {
              updateSession(peerId, (s) => ({
                ...s,
                localStream: stream,
                video: "active",
              }));
            })
            .catch(() => {
              updateSession(peerId, (s) => ({ ...s, video: "none" }));
              session.peer.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (session.video === "requesting") {
          updateSession(peerId, (s) => ({ ...s, video: "none" }));
          showNotice("Video declined.");
        }
        break;
      case "video-busy":
        if (session.video === "requesting") {
          updateSession(peerId, (s) => ({ ...s, video: "none" }));
          showNotice(
            `${peerDisplayName(session.peerName)} is already in another call`,
          );
        }
        break;
      case "video-end":
        session.peer.stopVideo();
        updateSession(peerId, (s) => ({
          ...s,
          localStream: null,
          remoteStream: null,
          video: "none",
        }));
        break;
    }
  }

  function startPeer(peerId: string, initiator: boolean) {
    const { name, gender, location } = resolvePeer(peerId);
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        void sendSignal(sessionId, peerId, type, payload);
      },
      onChat: (text) => addMessage(peerId, false, text),
      onControl: (ctrl) => handleControl(peerId, ctrl),
      onRemoteStream: (stream) => {
        updateSession(peerId, (s) => ({ ...s, remoteStream: stream }));
      },
      onConnectionState: (state) => {
        if (state === "failed") {
          teardown(peerId, "Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        updateSession(peerId, (s) => ({ ...s, conn: "connected" }));
      },
    });

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
    startPeer(peerId, false);
    void sendSignal(sessionId, peerId, "accept");
  }

  function declineIncoming() {
    const peerId = incomingPeerIdRef.current;
    if (!peerId) return;
    void sendSignal(sessionId, peerId, "decline");
    setIncomingPeerId(null);
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

  function startVideoRequest(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    if (!session || session.video !== "none") return;
    if (anySessionHasVideo(sessionsRef.current, peerId)) {
      showNotice("End the other video call first.");
      return;
    }
    updateSession(peerId, (s) => ({ ...s, video: "requesting" }));
    session.peer.sendControl("video-request");
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
        updateSession(peerId, (s) => ({
          ...s,
          localStream: stream,
          video: "active",
        }));
        session.peer.sendControl("video-accept");
      })
      .catch(() => {
        session.peer.sendControl("video-decline");
        updateSession(peerId, (s) => ({ ...s, video: "none" }));
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    session?.peer.sendControl("video-decline");
    updateSession(peerId, (s) => ({ ...s, video: "none" }));
  }

  function endVideo(peerId: string) {
    const session = sessionsRef.current.get(peerId);
    session?.peer.stopVideo();
    session?.peer.sendControl("video-end");
    updateSession(peerId, (s) => ({
      ...s,
      localStream: null,
      remoteStream: null,
      video: "none",
    }));
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
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId);
        if (!active) return;
        setPeers(data.peers);
        for (const s of data.signals) processSignalRef.current(s);
      } catch {}
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

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
  ) {
    setMyLocation({ lat, lng });
    setMyName(name);
    setMyGender(gender);
    setMyLocationLabel(location);
    await join(sessionId, lat, lng, name, gender, location);
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

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={filteredPeers}
        me={
          myLocation ? { ...myLocation, name: myName, gender: myGender } : null
        }
        onPeerClick={requestConnection}
      />

      {chatTabs.length > 0 && (
        <div className="absolute inset-y-0 right-0 z-20 w-full max-w-md">
          {activeSession && (
            <ChatPanel
              messages={activeSession.messages}
              peerName={formatPeerLabel(
                activeSession.peerName,
                activeSession.peerLocation,
              )}
              connected={activeSession.conn === "connected"}
              videoBusy={activeSession.video !== "none"}
              onSend={(text) => {
                activeSession.peer.sendChat(text);
                addMessage(activeSession.peerId, true, text);
              }}
              onStartVideo={() => startVideoRequest(activeSession.peerId)}
              onEnd={() => endConnection(activeSession.peerId)}
            />
          )}
          <ChatTabs tabs={chatTabs} onSelect={setActiveTab} />
        </div>
      )}

      {notice && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {notice}
        </div>
      )}

      {requestingPeerId && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          <span>
            Requesting connection with{" "}
            {peerDisplayName(resolvePeer(requestingPeerId).name)}…
          </span>
          <button
            onClick={cancelRequest}
            className="rounded-full bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}

      {incomingPeerId && (
        <ConnectionPrompt
          title={`${formatPeerLabel(
            resolvePeer(incomingPeerId).name,
            resolvePeer(incomingPeerId).location,
          )} wants to connect`}
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {videoSession?.video === "requesting" && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          Waiting for{" "}
          {formatPeerLabel(videoSession.peerName, videoSession.peerLocation)} to
          accept video call…
        </div>
      )}

      {videoSession?.video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle={`${formatPeerLabel(videoSession.peerName, videoSession.peerLocation)} wants to start a video call.`}
          acceptLabel="Accept"
          declineLabel="Decline"
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
          onEnd={() => endVideo(videoSession.peerId)}
        />
      )}

      {videoSession?.video !== "active" && (
        <BottomBar
          onlineCount={peers.length}
          onChangelogOpen={() => setChangelogOpen(true)}
          genderFilter={genderFilter}
          onGenderFilterChange={setGenderFilter}
        />
      )}

      <ChangelogPanel
        content={changelogContent}
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
    </main>
  );
}
