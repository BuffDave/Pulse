"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EmojiClickData } from "emoji-picker-react";
import { EmojiStyle, Theme } from "emoji-picker-react";
import {
  MessageCircle,
  PhoneOff,
  SendHorizonal,
  Smile,
  Video,
} from "lucide-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const REACTION_EMOJIS = [
  "1f44d",
  "2764-fe0f",
  "1f602",
  "1f62e",
  "1f622",
  "1f621",
];

const PICKER_PROPS = {
  theme: Theme.DARK,
  emojiStyle: EmojiStyle.NATIVE,
  skinTonesDisabled: true,
  lazyLoadEmojis: false,
  autoFocusSearch: false,
} as const;

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
  nonce: string;
  reactions: Array<{ emoji: string; mine: boolean }>;
}

interface ReactionAnchor {
  nonce: string;
  rect: DOMRect;
  mine: boolean;
}

function groupReactions(reactions: ChatMessage["reactions"]) {
  const groups = new Map<string, { count: number; hasMine: boolean }>();
  for (const r of reactions) {
    const existing = groups.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.mine) existing.hasMine = true;
    } else {
      groups.set(r.emoji, { count: 1, hasMine: r.mine });
    }
  }
  return groups;
}

export default function ChatPanel({
  messages,
  peerName,
  connected,
  videoBusy,
  embedded = false,
  onSend,
  onReact,
  onStartVideo,
  onEnd,
}: {
  messages: ChatMessage[];
  peerName: string;
  connected: boolean;
  videoBusy: boolean;
  embedded?: boolean;
  onSend: (text: string) => void;
  onReact: (nonce: string, emoji: string) => void;
  onStartVideo: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<ReactionAnchor | null>(
    null,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (pickerRef.current?.contains(e.target as Node)) return;
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

  useEffect(() => {
    if (!reactionAnchor) return;
    function onScroll() {
      setReactionAnchor(null);
    }
    messagesRef.current?.addEventListener("scroll", onScroll, {
      passive: true,
    });
    return () => {
      messagesRef.current?.removeEventListener("scroll", onScroll);
    };
  }, [reactionAnchor]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  }

  function onEmojiClick(data: EmojiClickData) {
    setDraft((d) => d + data.emoji);
    setPickerOpen(false);
    inputRef.current?.focus();
  }

  function onReactionClick(nonce: string, data: EmojiClickData) {
    onReact(nonce, data.emoji);
    setReactionAnchor(null);
  }

  function cancelReactionClose() {
    if (reactionLeaveTimer.current) {
      clearTimeout(reactionLeaveTimer.current);
      reactionLeaveTimer.current = null;
    }
  }

  function scheduleReactionClose() {
    cancelReactionClose();
    reactionLeaveTimer.current = setTimeout(() => setReactionAnchor(null), 250);
  }

  function openReactionPicker(nonce: string, mine: boolean, el: HTMLElement) {
    if (!connected) return;
    cancelReactionClose();
    setReactionAnchor({ nonce, rect: el.getBoundingClientRect(), mine });
  }

  const showReactionAbove =
    reactionAnchor !== null && reactionAnchor.rect.top > 56;

  return (
    <div
      className={
        embedded
          ? "relative flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] portrait:max-w-none landscape:max-w-md landscape:shrink-0"
          : "animate-slide-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-base)]/92 text-[var(--text-primary)] shadow-2xl"
      }
    >
      {!embedded && (
        <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-4 py-3 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold">{peerName}</p>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-[var(--accent)]" : "animate-pulse bg-amber-400"}`}
                aria-hidden
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {connected ? "Connected" : "Connecting…"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onStartVideo}
              disabled={!connected || videoBusy}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm transition duration-200 hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Video className="h-4 w-4" aria-hidden />
              Video
            </button>
            <button
              onClick={onEnd}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition duration-200 hover:bg-red-400"
            >
              <PhoneOff className="h-4 w-4" aria-hidden />
              End
            </button>
          </div>
        </header>
      )}

      <div ref={messagesRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <MessageCircle
              className="h-10 w-10 text-[var(--text-muted)]"
              aria-hidden
            />
            <p className="max-w-[14rem] text-sm text-[var(--text-secondary)]">
              Say hello. Messages are peer-to-peer and never stored.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const reactionGroups = groupReactions(m.reactions);

          return (
            <div
              key={m.id}
              className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}
            >
              <div
                className="max-w-[80%]"
                onMouseEnter={(e) =>
                  openReactionPicker(m.nonce, m.mine, e.currentTarget)
                }
                onMouseLeave={scheduleReactionClose}
              >
                <span
                  className={`block whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.mine
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-[var(--bg-base)]"
                      : "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  }`}
                >
                  {m.text}
                </span>
              </div>
              {reactionGroups.size > 0 && (
                <div
                  className={`mt-1 flex flex-wrap gap-1 ${
                    m.mine ? "justify-end" : "justify-start"
                  }`}
                >
                  {[...reactionGroups.entries()].map(
                    ([emoji, { count, hasMine }]) =>
                      hasMine ? (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => onReact(m.nonce, emoji)}
                          className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border border-[var(--accent)]/60 bg-[var(--accent-glow)] px-2 py-0.5 text-xs transition duration-200 hover:bg-[var(--accent)]/20"
                        >
                          <span>{emoji}</span>
                          {count > 1 && (
                            <span className="text-[var(--text-secondary)]">
                              {count}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span
                          key={emoji}
                          className="inline-flex items-center gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2 py-0.5 text-xs"
                        >
                          <span>{emoji}</span>
                          {count > 1 && (
                            <span className="text-[var(--text-secondary)]">
                              {count}
                            </span>
                          )}
                        </span>
                      ),
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {isMounted &&
        reactionAnchor &&
        connected &&
        createPortal(
          <div
            ref={reactionPickerRef}
            className="fixed z-[9999]"
            onMouseEnter={cancelReactionClose}
            onMouseLeave={scheduleReactionClose}
            style={{
              ...(reactionAnchor.mine
                ? { right: window.innerWidth - reactionAnchor.rect.right }
                : {
                    left: Math.min(
                      window.innerWidth - 308,
                      Math.max(8, reactionAnchor.rect.left),
                    ),
                  }),
              ...(showReactionAbove
                ? {
                    top: reactionAnchor.rect.top - 4,
                    transform: "translateY(-100%)",
                  }
                : { top: reactionAnchor.rect.bottom + 4 }),
            }}
          >
            <EmojiPicker
              {...PICKER_PROPS}
              reactionsDefaultOpen
              allowExpandReactions={false}
              reactions={REACTION_EMOJIS}
              onReactionClick={(data) =>
                onReactionClick(reactionAnchor.nonce, data)
              }
            />
          </div>,
          document.body,
        )}

      <form
        onSubmit={submit}
        className="relative flex items-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
      >
        {pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-0 z-50 mb-2 max-w-[min(100vw-2rem,320px)]"
          >
            <EmojiPicker {...PICKER_PROPS} onEmojiClick={onEmojiClick} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setPickerOpen((open) => !open)}
          disabled={!connected}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Add emoji"
        >
          <Smile className="h-5 w-5" aria-hidden />
        </button>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          rows={1}
          className="max-h-[120px] min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-transparent bg-[var(--bg-elevated)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--accent)] text-[var(--bg-base)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
