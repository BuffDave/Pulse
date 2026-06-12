import type { ReactNode } from "react";
import { getPrivacyNoteOuterClass } from "@/lib/mapBounds";

type StatusToastProps = {
  position: "top" | "bottom";
  children: ReactNode;
  /** z-index tier; default 65 (above expanded chat), privacy note uses 50 */
  zIndex?: 50 | 65;
  /** outer max width cap */
  width?: "22rem" | "28rem";
  /** Shift bottom toast to stay centered in the map area beside chat */
  sidebarAware?: { show: boolean; minimized: boolean };
  className?: string;
  innerClassName?: string;
  role?: string;
};

const WIDTH_CLASS = {
  "22rem": "w-[min(100vw-1.5rem,22rem)]",
  "28rem": "w-[min(100vw-1.5rem,28rem)]",
} as const;

const POSITION_CLASSES = {
  top: "absolute left-1/2 top-[max(5rem,env(safe-area-inset-top))] -translate-x-1/2",
  bottom:
    "fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] sm:bottom-[calc(7.25rem+env(safe-area-inset-bottom))]",
} as const;

export default function StatusToast({
  position,
  children,
  zIndex = 65,
  width = "28rem",
  sidebarAware,
  className = "",
  innerClassName = "",
  role,
}: StatusToastProps) {
  const zClass = zIndex === 50 ? "z-50" : "z-[65]";
  const bottomLayout =
    position === "bottom" && sidebarAware
      ? getPrivacyNoteOuterClass(sidebarAware.show, sidebarAware.minimized)
      : position === "bottom"
        ? "left-1/2 -translate-x-1/2"
        : "";
  const widthClass =
    position === "bottom" && sidebarAware?.show
      ? ""
      : WIDTH_CLASS[width];
  const topLayout =
    position === "top" ? "left-1/2 -translate-x-1/2" : "";

  return (
    <div
      className={`pointer-events-none ${POSITION_CLASSES[position]} ${zClass} ${widthClass} ${bottomLayout} ${topLayout} ${className}`}
      role={role}
    >
      <div
        className={`panel-glass animate-fade-up pointer-events-auto flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-xl ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
