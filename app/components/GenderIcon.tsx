import { genderColor } from "@/lib/peerDisplay";
import type { Gender } from "@/lib/types";

const ICONS: Record<Gender | "default", string> = {
  male: '<circle cx="10" cy="14" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14.5 9.5 20 4M17 4h3v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  female:
    '<circle cx="12" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 14.5V21M8.5 18.5h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  other:
    '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 20v-1a6 6 0 0 1 12 0v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  default: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
};

function iconInner(gender: string): string {
  if (gender === "male" || gender === "female" || gender === "other") {
    return ICONS[gender];
  }
  return ICONS.default;
}

export function genderIconHtml(gender: string, size = 14): string {
  const color =
    gender === "male" || gender === "female" || gender === "other"
      ? genderColor(gender)
      : "#a1a1aa";
  return `<svg class="pulse-gender-icon" style="color:${color}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" aria-hidden="true">${iconInner(gender)}</svg>`;
}

function MaleIcon() {
  return (
    <>
      <circle cx="10" cy="14" r="5.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14.5 9.5 20 4M17 4h3v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function FemaleIcon() {
  return (
    <>
      <circle cx="12" cy="9" r="5.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 14.5V21M8.5 18.5h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  );
}

function OtherIcon() {
  return (
    <>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 20v-1a6 6 0 0 1 12 0v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  );
}

function DefaultIcon() {
  return <circle cx="12" cy="12" r="3" fill="currentColor" />;
}

export default function GenderIcon({
  gender,
  size = "md",
  className = "",
}: {
  gender: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-3 w-3" : "h-6 w-6";
  const Icon =
    gender === "male"
      ? MaleIcon
      : gender === "female"
        ? FemaleIcon
        : gender === "other"
          ? OtherIcon
          : DefaultIcon;

  return (
    <svg
      className={`${dim} shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <Icon />
    </svg>
  );
}
