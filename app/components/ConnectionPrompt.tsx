"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { UserPlus } from "lucide-react";

export default function ConnectionPrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  icon: Icon = UserPlus,
  audioVariant = "connection",
  timeoutMs,
  receivedAt = 0,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  icon?: LucideIcon;
  audioVariant?: "connection" | "video";
  timeoutMs?: number;
  /** Epoch ms when the request was sent (drives smooth progress bar). */
  receivedAt?: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [timeoutProgress, setTimeoutProgress] = useState(1);
  const remainingMs =
    timeoutMs && timeoutMs > 0 && receivedAt > 0
      ? Math.max(0, timeoutMs - (Date.now() - receivedAt))
      : 0;
  const remainingMsRef = useRef(remainingMs);
  remainingMsRef.current = remainingMs;

  useEffect(() => {
    if (!timeoutMs || timeoutMs <= 0 || receivedAt <= 0) return;

    let raf = 0;
    const tick = () => {
      const fraction = Math.max(0, 1 - (Date.now() - receivedAt) / timeoutMs);
      setTimeoutProgress(fraction);
      if (fraction > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeoutMs, receivedAt]);

  useEffect(() => {
    function playConnection() {
      try {
        const ctx = new AudioContext();
        [
          [520, 0],
          [780, 0.15],
        ].forEach(([freq, delay]) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + delay + 0.18,
          );
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.18);
        });
      } catch {
        // audio unavailable or blocked — ignore
      }
    }

    function playVideo() {
      try {
        const ctx = new AudioContext();
        [0, 0.27].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = 660;
          gain.gain.setValueAtTime(0.22, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            ctx.currentTime + delay + 0.15,
          );
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.15);
        });
      } catch {
        // audio unavailable or blocked — ignore
      }
    }

    const play =
      audioVariant === "video" ? playVideo : playConnection;

    play();
    const interval = window.setInterval(play, 3000);
    const stopAt =
      remainingMsRef.current > 0
        ? window.setTimeout(
            () => window.clearInterval(interval),
            remainingMsRef.current,
          )
        : null;

    return () => {
      window.clearInterval(interval);
      if (stopAt) window.clearTimeout(stopAt);
    };
  }, [audioVariant]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-md">
      <div className="panel-glass animate-scale-in w-full max-w-xs rounded-3xl p-8 text-center text-[var(--text-primary)] shadow-2xl">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-glow)]"
          aria-hidden
        >
          <Icon className="h-6 w-6 text-[var(--accent)]" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
        {timeoutMs !== undefined && timeoutMs > 0 && receivedAt > 0 && (
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${timeoutProgress * 100}%` }}
            />
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 cursor-pointer rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition duration-200 hover:border-white/25 hover:text-[var(--text-primary)]"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 cursor-pointer rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--bg-base)] shadow-[0_0_16px_var(--accent-glow)] transition duration-200 hover:brightness-110"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
