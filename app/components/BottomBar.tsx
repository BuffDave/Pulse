"use client";

import { useEffect, useRef, useState } from "react";
import GenderIcon from "@/app/components/GenderIcon";
import type { Gender } from "@/lib/types";

export type GenderFilter = "all" | Gender;

const FILTER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function filterLabel(filter: GenderFilter): string {
  return FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All";
}

export default function BottomBar({
  onlineCount,
  onChangelogOpen,
  genderFilter,
  onGenderFilterChange,
}: {
  onlineCount: number;
  onChangelogOpen: () => void;
  genderFilter: GenderFilter;
  onGenderFilterChange: (filter: GenderFilter) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (barRef.current?.contains(e.target as Node)) return;
      setDropdownOpen(false);
    }
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [dropdownOpen]);

  return (
    <div className="pointer-events-none absolute bottom-10 left-1/2 z-30 -translate-x-1/2 pb-[env(safe-area-inset-bottom)]">
      <div ref={barRef} className="pointer-events-auto relative">
        {dropdownOpen && (
          <div
            className="absolute bottom-full right-0 z-50 mb-2 min-w-[9rem] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/95 py-1 shadow-xl backdrop-blur"
            role="listbox"
          >
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={genderFilter === opt.value}
                onClick={() => {
                  onGenderFilterChange(opt.value);
                  setDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs transition ${
                  genderFilter === opt.value
                    ? "bg-emerald-400/10 text-emerald-300"
                    : "text-zinc-300 hover:bg-zinc-800/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid w-[min(100vw-2rem,22rem)] grid-cols-3 items-stretch overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-900/90 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={onChangelogOpen}
            className="flex items-center justify-center px-2 py-2.5 text-xs text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
          >
            Changelog
          </button>

          <div className="flex items-center justify-center border-x border-zinc-700/60 px-2 py-2">
            <span className="text-lg font-bold text-emerald-400">
              {onlineCount}
            </span>
            <span className="ml-1.5 text-xs text-zinc-400">online</span>
          </div>

          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="flex items-center justify-center gap-1 px-2 py-2.5 text-xs text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-200"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {genderFilter !== "all" && (
              <GenderIcon gender={genderFilter} size="sm" />
            )}
            <span className="truncate">{filterLabel(genderFilter)}</span>
            <span className="shrink-0 text-[10px] text-zinc-500">▾</span>
          </button>
        </div>
      </div>
    </div>
  );
}
