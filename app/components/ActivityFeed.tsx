"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Megaphone } from "lucide-react";
import { peerDisplayName } from "@/lib/peerDisplay";

export interface ActivityFeedItem {
  id: string;
  name: string;
  location: string;
  text: string;
  addedAt: number;
}

const MAX_VISIBLE_DESKTOP = 5;
const MAX_VISIBLE_MOBILE = 2;

function stackStyle(index: number, maxVisible: number): CSSProperties {
  return {
    zIndex: maxVisible - index,
    opacity: Math.max(0.55, 1 - index * 0.15),
    transform: index > 0 ? `scale(${1 - index * 0.03})` : undefined,
    transformOrigin: "top center",
  };
}

function useMaxVisible() {
  const [maxVisible, setMaxVisible] = useState(MAX_VISIBLE_DESKTOP);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    function update() {
      setMaxVisible(mq.matches ? MAX_VISIBLE_MOBILE : MAX_VISIBLE_DESKTOP);
    }
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return maxVisible;
}

export default function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  const prevLengthRef = useRef(0);
  const maxVisible = useMaxVisible();

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

  const visible = items.slice(0, maxVisible);

  return (
    <div
      className="pointer-events-none absolute z-30 w-[min(calc(100vw-1.5rem),13rem)] top-[max(4.5rem,env(safe-area-inset-top))] sm:top-1/2 sm:w-[min(100vw-3rem,19rem)] sm:-translate-y-1/2"
      style={{ left: "max(1rem, env(safe-area-inset-left))" }}
      aria-live="polite"
      aria-label="Megaphone activity"
    >
      <div className="feed-stack flex flex-col gap-1.5 sm:gap-2.5">
        {visible.map((item, index) => (
          <div
            key={item.id}
            className="transition-[transform,opacity] duration-300"
            style={stackStyle(index, maxVisible)}
          >
            <div className="feed-item panel-glass pointer-events-auto flex items-start gap-2 rounded-xl px-2.5 py-2 shadow-lg sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-3">
              <Megaphone
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)] sm:h-4 sm:w-4"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)] sm:text-xs">
                  {peerDisplayName(item.name)}
                  {item.location ? (
                    <span className="font-normal normal-case tracking-normal text-[var(--text-secondary)]">
                      {" "}
                      from {item.location}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--text-primary)] sm:mt-1 sm:line-clamp-none sm:text-sm">
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
