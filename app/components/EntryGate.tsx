"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import GenderIcon from "@/app/components/GenderIcon";
import { reverseGeocode } from "@/lib/reverseGeocode";
import type { Gender } from "@/lib/types";

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
  ) => void;
}) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
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
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const location = await reverseGeocode(lat, lng);
        onReady(lat, lng, name.trim(), gender, location);
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
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <div className="animate-fade-up text-center">
          <h1 className="pulse-logo text-6xl font-bold tracking-tight">
            Pulse<span className="pulse-logo-dot text-[var(--accent)]">.</span>
          </h1>
          <p className="mt-3 max-w-xs text-[var(--text-secondary)]">
            A living globe of anonymous strangers. Drop onto the map and
            connect.
          </p>
        </div>

        <div className="panel-glass animate-fade-up-delay-1 w-full rounded-3xl p-8 shadow-2xl">
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

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-[var(--text-secondary)]">
                Gender
              </legend>
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
            </fieldset>

            <button
              onClick={() => void enter()}
              disabled={!canEnter || status === "locating"}
              className="btn-shimmer flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--accent)] font-semibold text-[var(--bg-base)] transition duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "locating" ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Locating…
                </>
              ) : (
                "Enter Pulse"
              )}
            </button>

            {status === "error" && (
              <p className="text-center text-sm text-red-400">{error}</p>
            )}
          </div>
        </div>

        <p className="animate-fade-up-delay-2 flex max-w-xs items-start gap-2 text-center text-xs text-[var(--text-muted)]">
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
