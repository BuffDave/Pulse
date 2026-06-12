"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, ScrollText, X } from "lucide-react";
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
  compact = false,
}: {
  onlineCount: number;
  onChangelogOpen: () => void;
  genderFilter: GenderFilter;
  onGenderFilterChange: (filter: GenderFilter) => void;
  /** When true (chat open), mobile shows a bottom-left burger instead of the bar. */
  compact?: boolean;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!burgerOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (burgerRef.current?.contains(e.target as Node)) return;
      setBurgerOpen(false);
    }
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [burgerOpen]);

  const bar = (
    <div
      ref={barRef}
      className={`pointer-events-auto relative ${compact ? "hidden sm:block" : ""}`}
    >
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

      <div className="panel-glass grid grid-cols-3 items-stretch overflow-hidden rounded-full shadow-xl">
        <button
          type="button"
          onClick={onChangelogOpen}
          className="flex cursor-pointer items-center justify-center gap-1 px-2 py-2.5 text-[10px] text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)] sm:gap-1.5 sm:px-4 sm:text-xs md:px-5"
        >
          <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden min-[380px]:inline">Changelog</span>
          <span className="min-[380px]:hidden">Log</span>
        </button>

        <div className="flex items-center justify-center border-x border-[var(--border-subtle)] px-1 py-2 sm:px-2 sm:py-2.5">
          <span
            className="mr-1 h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          <span className="text-base font-bold text-[var(--accent)] sm:text-lg">
            {onlineCount}
          </span>
          <span className="ml-1 text-[10px] text-[var(--text-secondary)] sm:ml-1.5 sm:text-xs">
            online
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDropdownOpen((open) => !open)}
          className="flex cursor-pointer items-center justify-center gap-1 px-2 py-2.5 text-[10px] text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)] sm:text-xs"
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
  );

  const burger = compact ? (
    <div
      ref={burgerRef}
      className="pointer-events-auto relative sm:hidden"
    >
      {burgerOpen && (
        <div className="panel-glass animate-fade-up absolute bottom-full left-0 z-50 mb-2 min-w-[11rem] overflow-hidden rounded-xl py-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChangelogOpen();
              setBurgerOpen(false);
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs text-[var(--text-secondary)] transition duration-200 hover:bg-white/5 hover:text-[var(--text-primary)]"
          >
            <ScrollText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Changelog
          </button>
          <div className="flex items-center gap-2 border-y border-[var(--border-subtle)] px-3 py-2.5 text-xs text-[var(--text-secondary)]">
            <span
              className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--accent)]"
              aria-hidden
            />
            <span className="font-bold text-[var(--accent)]">
              {onlineCount}
            </span>
            <span>online</span>
          </div>
          <p className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Show on map
          </p>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onGenderFilterChange(opt.value);
                setBurgerOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition duration-200 ${
                genderFilter === opt.value
                  ? "bg-[var(--accent-glow)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
              }`}
            >
              {opt.value !== "all" && (
                <GenderIcon gender={opt.value} size="sm" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setBurgerOpen((open) => !open)}
        aria-label={burgerOpen ? "Close menu" : "Open menu"}
        aria-expanded={burgerOpen}
        className="panel-glass flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] shadow-xl transition duration-200 hover:text-[var(--text-primary)]"
      >
        {burgerOpen ? (
          <X className="h-5 w-5" aria-hidden />
        ) : (
          <Menu className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 w-[min(100vw-1.5rem,22rem)] -translate-x-1/2 pb-[env(safe-area-inset-bottom)] sm:bottom-10 sm:w-auto">
        {bar}
      </div>
      {burger && (
        <div
          className="pointer-events-none fixed bottom-6 left-4 z-30 pb-[env(safe-area-inset-bottom)] sm:bottom-10"
          style={{ left: "max(1rem, env(safe-area-inset-left))" }}
        >
          {burger}
        </div>
      )}
    </>
  );
}
