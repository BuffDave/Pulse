"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import ChatPanel, { type ChatMessage } from "./ChatPanel";

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {muted && <line x1="1" y1="1" x2="23" y2="23" />}
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      {off && <line x1="1" y1="1" x2="23" y2="23" />}
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 rotate-[135deg]"
      aria-hidden
    >
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

export default function VideoPanel({
  peerName,
  localStream,
  remoteStream,
  audioMuted,
  cameraEnabled,
  messages,
  connected,
  onSend,
  onReact,
  onToggleMute,
  onToggleCamera,
  onEnd,
}: {
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioMuted: boolean;
  cameraEnabled: boolean;
  messages: ChatMessage[];
  connected: boolean;
  onSend: (text: string) => void;
  onReact: (nonce: string, emoji: string) => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 justify-center bg-black">
      <div className="flex min-h-0 w-full max-w-[1340px] flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] landscape:flex-row">
        <div className="flex min-h-0 min-w-0 flex-col gap-4 landscape:min-h-0 landscape:flex-1">
          <div className="relative aspect-[9/16] w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-surface)] landscape:aspect-auto landscape:min-h-0 landscape:flex-1">
            <video
              ref={remoteRef}
              autoPlay
              playsInline
              className="h-full w-full object-contain"
            />
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
                <Loader2
                  className="h-8 w-8 animate-spin text-[var(--accent)]"
                  aria-hidden
                />
                <p className="text-sm">
                  Waiting for video call with {peerName}…
                </p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">
                {peerName}
              </p>
            </div>
            <div className="absolute bottom-4 right-4">
              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className="block h-auto max-h-[min(32vh,14rem)] w-auto max-w-[min(32vw,12rem)] rounded-2xl object-contain ring-2 ring-white/20"
              />
              {!cameraEnabled && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Camera off
                  </span>
                </div>
              )}
              {audioMuted && (
                <div className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Muted
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <div className="panel-glass flex items-center gap-2 rounded-full px-3 py-2">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={
                  audioMuted ? "Unmute microphone" : "Mute microphone"
                }
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition duration-200 ${
                  audioMuted
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                <MicIcon muted={audioMuted} />
              </button>
              <button
                type="button"
                onClick={onToggleCamera}
                aria-label={
                  cameraEnabled ? "Turn camera off" : "Turn camera on"
                }
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-full transition duration-200 ${
                  !cameraEnabled
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                <CameraIcon off={!cameraEnabled} />
              </button>
              <button
                type="button"
                onClick={onEnd}
                aria-label="End call"
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white transition duration-200 hover:bg-red-400"
              >
                <EndCallIcon />
              </button>
            </div>
          </div>
        </div>

        <ChatPanel
          messages={messages}
          peerName={peerName}
          connected={connected}
          videoBusy={true}
          embedded={true}
          onSend={onSend}
          onReact={onReact}
          onStartVideo={() => {}}
          onEnd={() => {}}
        />
      </div>
    </div>
  );
}
