"use client";

import GenderIcon from "@/app/components/GenderIcon";
import { peerDisplayName } from "@/lib/peerDisplay";
import type { Gender } from "@/lib/types";

export interface ChatTab {
  peerId: string;
  peerName: string;
  peerGender: Gender;
  unread: number;
  active: boolean;
}

function TabButton({
  tab,
  displayName,
  animationDelay,
  onSelect,
}: {
  tab: ChatTab;
  displayName: string;
  animationDelay?: string;
  onSelect: (peerId: string) => void;
}) {
  return (
    <button
      key={tab.peerId}
      type="button"
      onClick={() => onSelect(tab.peerId)}
      style={animationDelay ? { animationDelay } : undefined}
      className={`flex min-w-0 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm text-white shadow-lg backdrop-blur transition duration-200 ${
        tab.active
          ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
          : "panel-glass border-white/[0.09] hover:border-white/15"
      } ${animationDelay ? "animate-fade-up" : ""}`}
    >
      <GenderIcon gender={tab.peerGender} size="sm" className="text-white" />
      <span className="truncate font-medium">{displayName}</span>
      {tab.unread > 0 && (
        <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
          {tab.unread > 99 ? "99+" : tab.unread}
        </span>
      )}
    </button>
  );
}

export default function ChatTabs({
  tabs,
  onSelect,
}: {
  tabs: ChatTab[];
  onSelect: (peerId: string) => void;
}) {
  if (tabs.length === 0) return null;

  return (
    <>
      {/* Mobile: horizontal strip above chat */}
      <div className="absolute inset-x-0 top-0 z-10 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 px-3 py-2 backdrop-blur-md md:hidden">
        {tabs.map((tab) => (
          <TabButton
            key={tab.peerId}
            tab={tab}
            displayName={peerDisplayName(tab.peerName)}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Desktop: vertical pills to the left */}
      <div className="absolute left-0 top-3 z-10 hidden max-w-[12rem] -translate-x-full flex-col gap-2 pr-2 md:flex">
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.peerId}
            tab={tab}
            displayName={peerDisplayName(tab.peerName)}
            animationDelay={`${index * 0.05}s`}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}
