// Shared types across client + API.
import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  Globe,
  MessageCircle,
  Moon,
  Palette,
} from "lucide-react";

// Signal mailbox message types.
export type SignalType =
  | "request" // connection request (tap a dot)
  | "accept" // recipient accepted
  | "decline" // recipient declined (or auto-declined while busy)
  | "offer" // WebRTC SDP offer
  | "answer" // WebRTC SDP answer
  | "ice" // WebRTC ICE candidate
  | "end"; // hang up / leave the connection

export type Gender = "male" | "female" | "other";

export const MOOD_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  lucideIcon: LucideIcon;
}> = [
  { value: "chatty", label: "Chatty", lucideIcon: MessageCircle },
  { value: "exploring", label: "Exploring", lucideIcon: Globe },
  { value: "gaming", label: "Gaming", lucideIcon: Gamepad2 },
  { value: "creative", label: "Creative", lucideIcon: Palette },
  { value: "bored", label: "Bored", lucideIcon: Moon },
];

export type Mood = (typeof MOOD_OPTIONS)[number]["value"] | "";

export interface PeerDot {
  id: string;
  lat: number;
  lng: number;
  busy: boolean;
  name: string;
  gender: Gender;
  location: string;
  mood: string;
}

export interface SignalMsg {
  id: string;
  fromId: string;
  toId: string;
  type: SignalType;
  payload: string | null;
  createdAt: string;
}

export interface PollResponse {
  peers: PeerDot[];
  signals: SignalMsg[];
}
