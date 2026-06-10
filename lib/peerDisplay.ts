import type { Gender } from "@/lib/types";

export function peerDisplayName(name: string): string {
  return name.trim() || "Stranger";
}

export function genderColor(gender: Gender): string {
  switch (gender) {
    case "male":
      return "#60a5fa";
    case "female":
      return "#f472b6";
    case "other":
      return "#a1a1aa";
  }
}
