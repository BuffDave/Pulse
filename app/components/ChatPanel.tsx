"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { EmojiClickData } from "emoji-picker-react";
import { EmojiStyle, Theme } from "emoji-picker-react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Heart,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  PhoneOff,
  SendHorizonal,
  ShieldAlert,
  Smile,
  Video,
} from "lucide-react";
import GenderIcon from "@/app/components/GenderIcon";
import { peerDisplayName } from "@/lib/peerDisplay";
import type { ChatTab } from "@/app/components/ChatTabs";
import { useEmojiPickerSize } from "@/app/components/useEmojiPickerSize";
import {
  getPickerPortalStyle,
  shouldShowEmojiPreview,
} from "@/lib/emojiPickerLayout";

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
  isTyping = false,
  embedded = false,
  minimized = false,
  onToggleMinimize,
  tabs,
  onTabSelect,
  onSend,
  onReact,
  onTyping,
  onReport,
  onStartVideo,
  onEnd,
}: {
  messages: ChatMessage[];
  peerName: string;
  connected: boolean;
  videoBusy: boolean;
  isTyping?: boolean;
  embedded?: boolean;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  tabs?: ChatTab[];
  onTabSelect?: (peerId: string) => void;
  onSend: (text: string) => void;
  onReact: (nonce: string, emoji: string) => void;
  onTyping?: () => void;
  onReport?: () => void;
  onStartVideo: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [reported, setReported] = useState(false);
  const [reactionAnchor, setReactionAnchor] = useState<ReactionAnchor | null>(
    null,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const peerMsgBaselineRef = useRef(0);
  const prevMinimizedRef = useRef(minimized);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (embedded && minimized && !prevMinimizedRef.current) {
      peerMsgBaselineRef.current = messages.filter((m) => !m.mine).length;
    }
    prevMinimizedRef.current = minimized;
  }, [embedded, minimized, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    if (!pickerOpen) {
      setPickerAnchor(null);
      return;
    }
    const rect = emojiBtnRef.current?.getBoundingClientRect();
    if (rect) setPickerAnchor(rect);

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

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!connected || !onTyping || !value.trim()) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      onTyping();
      typingTimer.current = null;
    }, 400);
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

  function handleReport() {
    if (reported || !onReport) return;
    onReport();
    setReported(true);
  }

  const showReactionAbove =
    reactionAnchor !== null && reactionAnchor.rect.top > 56;

  const composePickerActive = pickerOpen && !minimized && pickerAnchor !== null;
  const pickerSize = useEmojiPickerSize(composePickerActive);

  const peerMsgCount = messages.filter((m) => !m.mine).length;
  const newPeerMsgsWhileMinimized = Math.max(
    0,
    peerMsgCount - peerMsgBaselineRef.current,
  );
  const showEmbeddedActivity =
    embedded && minimized && (isTyping || newPeerMsgsWhileMinimized > 0);

  const panelClass = embedded
    ? minimized
      ? "relative flex shrink-0 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] portrait:h-11 portrait:w-full portrait:flex-row portrait:items-center portrait:px-3 landscape:h-full landscape:w-12 landscape:flex-col landscape:items-center landscape:pt-3"
      : "relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] portrait:min-h-0 portrait:max-w-none landscape:max-w-lg landscape:shrink-0"
    : minimized
      ? "animate-slide-right absolute inset-y-0 right-0 flex w-12 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--bg-base)]/92 text-[var(--text-primary)] shadow-2xl"
      : "animate-slide-right absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-base)]/92 pt-12 text-[var(--text-primary)] shadow-2xl md:pt-0";

  return (
    <div className={panelClass}>
      {embedded && minimized ? (
        <div className="flex h-full w-full portrait:flex-row portrait:items-center portrait:gap-2 landscape:flex-col landscape:items-center landscape:gap-2 landscape:pt-1">
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              aria-label="Open chat"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition duration-200 hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)] landscape:h-9 landscape:w-9"
            >
              <ChevronUp
                className="h-4 w-4 portrait:block landscape:hidden"
                aria-hidden
              />
              <PanelRightOpen
                className="h-4 w-4 portrait:hidden landscape:block"
                aria-hidden
              />
            </button>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-medium portrait:block landscape:hidden">
            {peerName}
          </p>
          <span className="max-h-[min(40vh,12rem)] truncate text-xs font-medium text-[var(--text-secondary)] [writing-mode:vertical-rl] rotate-180 portrait:hidden landscape:block">
            {peerName}
          </span>
          {showEmbeddedActivity && (
            <span
              className="relative flex shrink-0 items-center justify-center portrait:ml-1 landscape:mt-1"
              aria-label={
                isTyping
                  ? "Peer is typing"
                  : `${newPeerMsgsWhileMinimized} new message${newPeerMsgsWhileMinimized === 1 ? "" : "s"}`
              }
            >
              {newPeerMsgsWhileMinimized > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {newPeerMsgsWhileMinimized > 9
                    ? "9+"
                    : newPeerMsgsWhileMinimized}
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
              )}
            </span>
          )}
        </div>
      ) : !embedded && minimized ? (
        <div className="flex flex-1 flex-col items-center gap-3 overflow-hidden pt-4">
          {onToggleMinimize && (
            <button
              type="button"
              onClick={onToggleMinimize}
              aria-label="Open chat"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition duration-200 hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              <PanelRightOpen className="h-4 w-4" aria-hidden />
            </button>
          )}
          {tabs && tabs.length > 0 ? (
            <div className="flex w-full flex-col items-center gap-2 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.peerId}
                  type="button"
                  onClick={() => onTabSelect?.(tab.peerId)}
                  aria-label={peerDisplayName(tab.peerName)}
                  className={`relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition duration-200 ${
                    tab.active
                      ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)]"
                  }`}
                >
                  <GenderIcon gender={tab.peerGender} size="sm" />
                  {tab.unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold leading-none text-white">
                      {tab.unread > 9 ? "9+" : tab.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <span className="max-h-[min(40vh,12rem)] truncate text-xs font-medium text-[var(--text-secondary)] [writing-mode:vertical-rl] rotate-180">
              {peerName}
            </span>
          )}
        </div>
      ) : (
        <>
          {embedded ? (
            <header className="flex items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-4 py-2.5 backdrop-blur-md">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{peerName}</p>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-[var(--accent)]" : "animate-pulse bg-amber-400"}`}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {connected ? "Connected" : "Connecting…"}
                  </p>
                </div>
              </div>
              {onToggleMinimize && (
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  aria-label="Minimize chat"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition duration-200 hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)] landscape:h-9 landscape:w-9"
                >
                  <ChevronDown
                    className="h-4 w-4 portrait:block landscape:hidden"
                    aria-hidden
                  />
                  <PanelRightClose
                    className="h-4 w-4 portrait:hidden landscape:block"
                    aria-hidden
                  />
                </button>
              )}
            </header>
          ) : (
            <header className="flex items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-4 py-3 backdrop-blur-md">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {onToggleMinimize && (
                  <button
                    type="button"
                    onClick={onToggleMinimize}
                    aria-label="Minimize chat"
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition duration-200 hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)]"
                  >
                    <PanelRightClose className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold">
                      {peerName}
                    </p>
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${connected ? "bg-[var(--accent)]" : "animate-pulse bg-amber-400"}`}
                      aria-hidden
                    />
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {connected ? "Connected" : "Connecting…"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {onReport && (
                  <button
                    type="button"
                    onClick={handleReport}
                    disabled={reported}
                    aria-label={reported ? "Reported" : "Report user"}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] transition duration-200 hover:border-white/20 hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Flag className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <button
                  onClick={onStartVideo}
                  disabled={!connected || videoBusy}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-default)] px-3 py-1.5 text-sm transition duration-200 hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Video className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Video</span>
                </button>
                <button
                  onClick={onEnd}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition duration-200 hover:bg-red-400"
                >
                  <PhoneOff className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">End</span>
                </button>
              </div>
            </header>
          )}

          <div
            ref={messagesRef}
            className="pulse-scroll-surface flex-1 space-y-2 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <div className="mt-12 flex flex-col items-center gap-3 text-center">
                <MessageCircle
                  className="h-10 w-10 text-[var(--text-muted)]"
                  aria-hidden
                />
                <p className="max-w-[14rem] text-sm text-[var(--text-secondary)]">
                  Say hello. Messages are peer-to-peer and never stored.
                </p>
                <p className="flex max-w-[16rem] items-start gap-2 text-left text-xs text-[var(--text-muted)]">
                  <Heart
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>
                    Be kind — let&apos;s keep this a positive space for
                    everyone.
                  </span>
                </p>
                <p className="flex max-w-[16rem] items-start gap-2 text-left text-xs text-[var(--text-muted)]">
                  <ShieldAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                    aria-hidden
                  />
                  <span>
                    Don&apos;t share private info — phone numbers, addresses,
                    passwords, or anything that could identify you.
                  </span>
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
                      className={`pulse-reaction-chips ${m.mine ? "pulse-reaction-chips--mine" : ""}`}
                    >
                      {[...reactionGroups.entries()].map(
                        ([emoji, { count, hasMine }]) =>
                          hasMine ? (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReact(m.nonce, emoji)}
                              className="pulse-reaction-chip pulse-reaction-chip--mine"
                            >
                              <span>{emoji}</span>
                              {count > 1 && (
                                <span className="pulse-reaction-chip__count">
                                  {count}
                                </span>
                              )}
                            </button>
                          ) : (
                            <span key={emoji} className="pulse-reaction-chip">
                              <span>{emoji}</span>
                              {count > 1 && (
                                <span className="pulse-reaction-chip__count">
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
            {isTyping && (
              <p className="text-xs italic text-[var(--text-secondary)]">
                typing…
              </p>
            )}
            <div ref={endRef} />
          </div>

          {isMounted &&
            !minimized &&
            reactionAnchor &&
            connected &&
            createPortal(
              <div
                ref={reactionPickerRef}
                className="pulse-reaction-panel fixed z-[9999]"
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
                  className="pulse-reaction-picker"
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

          {isMounted &&
            composePickerActive &&
            pickerAnchor &&
            createPortal(
              <div
                ref={pickerRef}
                className="pulse-emoji-picker-wrap fixed z-[9999]"
                style={getPickerPortalStyle(pickerAnchor, pickerSize, {
                  preferBelow: false,
                  align: "start",
                })}
              >
                <EmojiPicker
                  {...PICKER_PROPS}
                  className="pulse-emoji-picker"
                  width={pickerSize.width}
                  height={pickerSize.height}
                  previewConfig={{
                    showPreview: shouldShowEmojiPreview(pickerSize.width),
                  }}
                  onEmojiClick={onEmojiClick}
                />
              </div>,
              document.body,
            )}

          <form
            onSubmit={submit}
            className="sticky bottom-0 flex items-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <button
              ref={emojiBtnRef}
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
              onChange={(e) => handleDraftChange(e.target.value)}
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
        </>
      )}
    </div>
  );
}
