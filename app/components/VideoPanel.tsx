"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Monitor, MonitorOff } from "lucide-react";
import ChatPanel, { type ChatMessage } from "./ChatPanel";
import { canScreenShare } from "@/lib/mediaSupport";

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

function CallControls({
  compact,
  audioMuted,
  cameraEnabled,
  screenSharing,
  screenShareSupported,
  onToggleMute,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onEnd,
}: {
  compact: boolean;
  audioMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  screenShareSupported: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onEnd: () => void;
}) {
  const btn = compact ? "h-10 w-10" : "h-12 w-12";
  const wrap = compact
    ? "flex items-center gap-1.5 rounded-full px-2 py-1.5"
    : "flex items-center gap-2 rounded-full px-3 py-2";

  return (
    <div className={`panel-glass ${wrap}`}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
        className={`flex ${btn} cursor-pointer items-center justify-center rounded-full transition duration-200 ${
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
        disabled={screenSharing}
        aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
        className={`flex ${btn} cursor-pointer items-center justify-center rounded-full transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
          !cameraEnabled
            ? "bg-red-500 text-white hover:bg-red-400"
            : "bg-white/10 text-white hover:bg-white/15"
        }`}
      >
        <CameraIcon off={!cameraEnabled} />
      </button>
      {screenShareSupported && (
        <button
          type="button"
          onClick={screenSharing ? onStopScreenShare : onStartScreenShare}
          aria-label={screenSharing ? "Stop screen sharing" : "Share screen"}
          className={`flex ${btn} cursor-pointer items-center justify-center rounded-full transition duration-200 ${
            screenSharing
              ? "bg-[var(--accent)] text-[var(--bg-base)] hover:brightness-110"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          {screenSharing ? (
            <MonitorOff className="h-5 w-5" aria-hidden />
          ) : (
            <Monitor className="h-5 w-5" aria-hidden />
          )}
        </button>
      )}
      <button
        type="button"
        onClick={onEnd}
        aria-label="End call"
        className={`flex ${btn} cursor-pointer items-center justify-center rounded-full bg-red-500 text-white transition duration-200 hover:bg-red-400`}
      >
        <EndCallIcon />
      </button>
    </div>
  );
}

export default function VideoPanel({
  peerName,
  localStream,
  remoteStream,
  audioMuted,
  cameraEnabled,
  screenSharing,
  messages,
  connected,
  isTyping,
  onSend,
  onReact,
  onTyping,
  onToggleMute,
  onToggleCamera,
  onStartScreenShare,
  onStopScreenShare,
  onEnd,
}: {
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioMuted: boolean;
  cameraEnabled: boolean;
  screenSharing: boolean;
  messages: ChatMessage[];
  connected: boolean;
  isTyping?: boolean;
  onSend: (text: string) => void;
  onReact: (nonce: string, emoji: string) => void;
  onTyping?: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onEnd: () => void;
}) {
  const [chatMinimized, setChatMinimized] = useState(false);
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

  const screenShareSupported = canScreenShare();

  const controlProps = {
    audioMuted,
    cameraEnabled,
    screenSharing,
    screenShareSupported,
    onToggleMute,
    onToggleCamera,
    onStartScreenShare,
    onStopScreenShare,
    onEnd,
  };

  return (
    <div className="absolute inset-0 z-[60] flex h-full min-h-0 justify-center overflow-hidden bg-black pt-[env(safe-area-inset-top)]">
      <div className="flex h-full min-h-0 w-full max-w-[1440px] flex-col gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] landscape:flex-row landscape:gap-4 landscape:p-4 landscape:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div
          className={`flex min-h-0 min-w-0 flex-col landscape:min-h-0 landscape:flex-1 landscape:gap-4 ${
            chatMinimized ? "min-h-0 flex-1" : "flex-none"
          }`}
        >
          <div
            className={`relative w-full overflow-hidden rounded-2xl bg-[var(--bg-surface)] landscape:aspect-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1 ${
              chatMinimized
                ? "min-h-0 flex-1 portrait:aspect-auto portrait:max-h-none portrait:min-h-0"
                : "aspect-[9/16] max-h-[min(50dvh,28rem)] min-h-[min(36dvh,14rem)] flex-none"
            }`}
          >
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
            <div className="absolute bottom-4 right-4 portrait:bottom-16 landscape:bottom-4">
              <video
                ref={localRef}
                autoPlay
                playsInline
                muted
                className="block h-auto max-h-[min(22dvh,9rem)] w-auto max-w-[min(28vw,8rem)] rounded-2xl object-contain ring-2 ring-white/20 landscape:max-h-[min(32vh,14rem)] landscape:max-w-[min(32vw,12rem)]"
              />
              {!cameraEnabled && !screenSharing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Camera off
                  </span>
                </div>
              )}
              {screenSharing && (
                <div className="absolute left-1 top-1 rounded bg-[var(--accent)]/90 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--bg-base)]">
                  Sharing
                </div>
              )}
              {audioMuted && (
                <div className="absolute left-1 top-1 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Muted
                </div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8 landscape:hidden">
              <CallControls compact {...controlProps} />
            </div>
          </div>
          <div className="hidden shrink-0 items-center justify-center landscape:flex">
            <CallControls compact={false} {...controlProps} />
          </div>
        </div>

        <ChatPanel
          messages={messages}
          peerName={peerName}
          connected={connected}
          videoBusy={true}
          isTyping={isTyping}
          embedded={true}
          minimized={chatMinimized}
          onToggleMinimize={() => setChatMinimized((m) => !m)}
          onSend={onSend}
          onReact={onReact}
          onTyping={onTyping}
          onStartVideo={() => {}}
          onEnd={() => {}}
        />
      </div>
    </div>
  );
}
