import { MOOD_OPTIONS } from "@/lib/types";

export function moodDisplay(mood: string): string {
  if (!mood) return "";
  const opt = MOOD_OPTIONS.find((m) => m.value === mood);
  return opt ? opt.label : mood;
}
