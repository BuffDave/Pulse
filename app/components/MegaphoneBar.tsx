"use client";

import { useEffect, useRef, useState } from "react";
import { Megaphone, Send, Trash2, X } from "lucide-react";

const MAX_LEN = 100;

export default function MegaphoneBar({
  activeBroadcast = "",
  onBroadcast,
  onClear,
}: {
  activeBroadcast?: string;
  onBroadcast: (text: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveBroadcast = activeBroadcast.length > 0;

  useEffect(() => {
    if (expanded && !hasActiveBroadcast) {
      inputRef.current?.focus();
    }
  }, [expanded, hasActiveBroadcast]);

  useEffect(() => {
    if (hasActiveBroadcast) {
      setExpanded(false);
      setText("");
    }
  }, [hasActiveBroadcast]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || hasActiveBroadcast) return;
    setSending(true);
    try {
      await onBroadcast(trimmed);
      setText("");
      setExpanded(false);
    } catch {
      /* parent may show notice */
    } finally {
      setSending(false);
    }
  }

  async function handleClear() {
    if (clearing) return;
    setClearing(true);
    try {
      await onClear();
    } catch {
      /* parent may show notice */
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 pt-[env(safe-area-inset-top)]">
      <div
        className={`panel-glass pointer-events-auto flex items-center gap-2 overflow-hidden rounded-full shadow-xl transition-all duration-300 ${
          expanded && !hasActiveBroadcast
            ? "w-[min(100vw-2rem,22rem)] px-3 py-2"
            : "max-w-[min(100vw-2rem,22rem)] px-3 py-2.5"
        }`}
      >
        {hasActiveBroadcast ? (
          <>
            <Megaphone
              className="h-4 w-4 shrink-0 text-[var(--accent)]"
              aria-hidden
            />
            <p className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">
              {activeBroadcast}
            </p>
            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={clearing}
              aria-label="Delete broadcast"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-red-400 transition duration-200 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : expanded ? (
          <>
            <Megaphone
              className="h-4 w-4 shrink-0 text-[var(--accent)]"
              aria-hidden
            />
            <input
              ref={inputRef}
              type="text"
              value={text}
              maxLength={MAX_LEN}
              disabled={sending}
              placeholder="Broadcast to the map…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSend();
                if (e.key === "Escape") {
                  setExpanded(false);
                  setText("");
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
            />
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
              {text.length}/{MAX_LEN}
            </span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!text.trim() || sending}
              aria-label="Send broadcast"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] text-[var(--bg-base)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setText("");
              }}
              aria-label="Close megaphone"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition duration-200 hover:bg-white/10 hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Open megaphone"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition duration-200 hover:text-[var(--text-primary)]"
          >
            <Megaphone className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <span className="hidden sm:inline">Megaphone</span>
          </button>
        )}
      </div>
    </div>
  );
}
