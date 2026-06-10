"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
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
            className="panel-glass animate-fade-up absolute bottom-full right-0 z-50 mb-2 min-w-[9rem] overflow-hidden rounded-xl py-1 shadow-xl"
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
                className={`w-full cursor-pointer px-3 py-2 text-left text-xs transition duration-200 ${
                  genderFilter === opt.value
                    ? "bg-[var(--accent-glow)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <div className="panel-glass grid w-[min(100vw-2rem,22rem)] grid-cols-3 items-stretch overflow-hidden rounded-full shadow-xl">
          <button
            type="button"
            onClick={onChangelogOpen}
            className="flex cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 text-xs text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Changelog</span>
          </button>

          <div className="flex items-center justify-center border-x border-[var(--border-subtle)] px-2 py-2">
            <span
              className="mr-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--accent)]"
              aria-hidden
            />
            <span className="text-lg font-bold text-[var(--accent)]">
              {onlineCount}
            </span>
            <span className="ml-1.5 text-xs text-[var(--text-secondary)]">
              online
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="flex cursor-pointer items-center justify-center gap-1 px-2 py-2.5 text-xs text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)]"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            {genderFilter !== "all" && (
              <GenderIcon gender={genderFilter} size="sm" />
            )}
            <span className="truncate">{filterLabel(genderFilter)}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 transition duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}
