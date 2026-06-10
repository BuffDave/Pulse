"use client";

import { genderColor, peerDisplayName } from "@/lib/peerDisplay";
import type { Gender } from "@/lib/types";

export interface ChatTab {
  peerId: string;
  peerName: string;
  peerGender: Gender;
  unread: number;
  active: boolean;
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
    <div className="absolute left-0 top-3 z-10 flex max-w-[12rem] -translate-x-full flex-col gap-2 pr-2">
      {tabs.map((tab, index) => {
        const displayName = peerDisplayName(tab.peerName);
        const color = genderColor(tab.peerGender);

        return (
          <button
            key={tab.peerId}
            type="button"
            onClick={() => onSelect(tab.peerId)}
            style={{ animationDelay: `${index * 0.05}s` }}
            className={`animate-fade-up flex min-w-0 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm text-[var(--text-primary)] shadow-lg backdrop-blur transition duration-200 ${
              tab.active
                ? "border-[var(--accent)]/50 bg-[var(--accent)]/10"
                : "panel-glass border-white/[0.09] hover:border-white/15"
            }`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: color }}
            />
            <span className="truncate font-medium">{displayName}</span>
            {tab.unread > 0 && (
              <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {tab.unread > 99 ? "99+" : tab.unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
