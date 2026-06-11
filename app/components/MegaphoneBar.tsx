"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { EmojiStyle, Theme } from "emoji-picker-react";
import { Megaphone, Send, Smile, Trash2, X } from "lucide-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const MAX_LEN = 100;

const PICKER_PROPS = {
  theme: Theme.DARK,
  emojiStyle: EmojiStyle.NATIVE,
  skinTonesDisabled: true,
  lazyLoadEmojis: false,
  autoFocusSearch: false,
} as const;

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);

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
      setPickerOpen(false);
    }
  }, [hasActiveBroadcast]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (pickerRef.current?.contains(target)) return;
      if (emojiBtnRef.current?.contains(target)) return;
      setPickerOpen(false);
    }
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [pickerOpen]);

  function onEmojiClick(data: EmojiClickData) {
    setText((t) => (t + data.emoji).slice(0, MAX_LEN));
    setPickerOpen(false);
    inputRef.current?.focus();
  }

  function closeExpanded() {
    setExpanded(false);
    setText("");
    setPickerOpen(false);
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || hasActiveBroadcast) return;
    setSending(true);
    try {
      await onBroadcast(trimmed);
      setText("");
      setExpanded(false);
      setPickerOpen(false);
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
        className={`panel-glass pointer-events-auto relative flex items-center gap-2 overflow-visible rounded-full shadow-xl transition-all duration-300 ${
          expanded && !hasActiveBroadcast
            ? "w-[min(100vw-2rem,22rem)] px-3 py-2"
            : "max-w-[min(100vw-2rem,22rem)] px-3 py-2.5"
        }`}
      >
        {pickerOpen && expanded && !hasActiveBroadcast && (
          <div
            ref={pickerRef}
            className="pulse-emoji-picker-wrap absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
          >
            <EmojiPicker
              {...PICKER_PROPS}
              className="pulse-emoji-picker"
              onEmojiClick={onEmojiClick}
            />
          </div>
        )}
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
                if (e.key === "Escape") closeExpanded();
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
            />
            <button
              ref={emojiBtnRef}
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              disabled={sending}
              aria-label="Add emoji"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition duration-200 hover:bg-white/10 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Smile className="h-4 w-4" aria-hidden />
            </button>
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
              onClick={closeExpanded}
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
