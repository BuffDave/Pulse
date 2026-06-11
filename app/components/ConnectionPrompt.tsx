"use client";

import type { LucideIcon } from "lucide-react";
import { UserPlus } from "lucide-react";

export default function ConnectionPrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  icon: Icon = UserPlus,
  timeoutMs,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  icon?: LucideIcon;
  timeoutMs?: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
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
        {timeoutMs !== undefined && timeoutMs > 0 && (
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="prompt-timeout-bar h-full rounded-full bg-[var(--accent)]"
              style={{ animationDuration: `${timeoutMs}ms` }}
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
