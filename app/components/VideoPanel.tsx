"use client";

import { useEffect, useRef } from "react";

export default function VideoPanel({
  peerName,
  localStream,
  remoteStream,
  onEnd,
}: {
  peerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-zinc-900 object-cover"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
            Waiting for video call with {peerName}…
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
          <p className="truncate text-sm font-semibold text-white">{peerName}</p>
        </div>
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 block h-auto max-h-[min(28vh,12rem)] w-auto max-w-[min(28vw,10rem)] rounded-lg border border-zinc-700 bg-zinc-800 object-contain shadow-lg"
        />
      </div>
      <div className="flex shrink-0 justify-center bg-zinc-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onEnd}
          className="rounded-full bg-red-500 px-8 py-3 font-semibold text-white hover:bg-red-400"
        >
          End call
        </button>
      </div>
    </div>
  );
}
