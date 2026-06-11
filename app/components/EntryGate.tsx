"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import GenderIcon from "@/app/components/GenderIcon";
import { reverseGeocode } from "@/lib/reverseGeocode";
import { MOOD_OPTIONS, type Gender, type Mood } from "@/lib/types";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function EntryGate({
  onReady,
}: {
  onReady: (
    lat: number,
    lng: number,
    name: string,
    gender: Gender,
    location: string,
    mood: Mood,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [mood, setMood] = useState<Mood>("");
  const [status, setStatus] = useState<"idle" | "locating" | "joining" | "error">(
    "idle",
  );
  const [error, setError] = useState<string>("");

  const canEnter = name.trim().length > 0 && gender !== null;

  async function enter() {
    if (!canEnter || !gender) return;

    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const location = await reverseGeocode(lat, lng);
          setStatus("joining");
          await onReady(lat, lng, name.trim(), gender, location, mood);
        } catch (err) {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't join Pulse. Please try again.",
          );
        }
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="entry-aurora flex min-h-full flex-1 flex-col items-center justify-center p-6 text-[var(--text-primary)]">
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="animate-fade-up text-center">
          <h1 className="pulse-logo text-6xl font-bold tracking-tight">
            Pulse<span className="pulse-logo-dot text-[var(--accent)]">.</span>
          </h1>
          <p className="mt-3 max-w-md text-[var(--text-secondary)]">
            A living globe of anonymous strangers. Drop onto the map and
            connect.
          </p>
        </div>

        <div className="panel-glass animate-fade-up-delay-1 w-full rounded-3xl p-6 shadow-2xl sm:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {/* Left column: name, gender, enter */}
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Your name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  placeholder="What should we call you?"
                  className="h-12 cursor-text rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-glow)]"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                  Gender
                </span>
                <div className="flex gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={`flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm transition duration-200 ${
                        gender === opt.value
                          ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)] shadow-[0_0_16px_var(--accent-glow)]"
                          : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <GenderIcon gender={opt.value} />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => void enter()}
                disabled={
                  !canEnter || status === "locating" || status === "joining"
                }
                className="btn-shimmer mt-auto flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--accent)] font-semibold text-[var(--bg-base)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "locating" || status === "joining" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    {status === "joining" ? "Joining…" : "Locating…"}
                  </>
                ) : (
                  "Enter Pulse"
                )}
              </button>

              {status === "error" && (
                <p className="text-center text-sm text-red-400">{error}</p>
              )}
            </div>

            {/* Right column: mood */}
            <div className="flex flex-col gap-2 md:border-l md:border-[var(--border-subtle)] md:pl-8">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Mood <span className="text-[var(--text-muted)]">(optional)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                {MOOD_OPTIONS.map((opt) => {
                  const Icon = opt.lucideIcon;
                  const selected = mood === opt.value;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setMood((current) =>
                          current === opt.value ? "" : (opt.value as Mood),
                        )
                      }
                      className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition duration-200 ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]"
                          : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Shown on your dot when others hover over you.
              </p>
            </div>
          </div>
        </div>

        <p className="animate-fade-up-delay-2 flex max-w-md items-start gap-2 text-center text-xs text-[var(--text-muted)]">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <span>
            No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
            Nothing is stored — closing the tab ends everything.
          </span>
        </p>
      </div>
    </div>
  );
}
