"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Megaphone } from "lucide-react";
import { peerDisplayName } from "@/lib/peerDisplay";

export interface ActivityFeedItem {
  id: string;
  name: string;
  text: string;
  addedAt: number;
}

const MAX_VISIBLE = 5;

function stackStyle(index: number): CSSProperties {
  return {
    zIndex: MAX_VISIBLE - index,
    opacity: Math.max(0.55, 1 - index * 0.15),
    transform: index > 0 ? `scale(${1 - index * 0.03})` : undefined,
    transformOrigin: "top center",
  };
}

export default function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (items.length <= prevLengthRef.current) {
      prevLengthRef.current = items.length;
      return;
    }
    prevLengthRef.current = items.length;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // audio unavailable or blocked — ignore
    }
  }, [items.length]);

  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <div
      className="pointer-events-none absolute left-4 top-1/2 z-30 w-[min(100vw-3rem,16rem)] -translate-y-1/2"
      style={{ left: "max(1rem, env(safe-area-inset-left))" }}
      aria-live="polite"
      aria-label="Megaphone activity"
    >
      <div className="feed-stack flex flex-col gap-2">
        {visible.map((item, index) => (
          <div
            key={item.id}
            className="transition-[transform,opacity] duration-300"
            style={stackStyle(index)}
          >
            <div className="feed-item panel-glass pointer-events-auto flex items-start gap-2 rounded-xl px-3 py-2.5 shadow-lg">
              <Megaphone
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {peerDisplayName(item.name)}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-[var(--text-primary)]">
                  {item.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
