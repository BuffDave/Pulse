"use client";

import { useState } from "react";
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
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-zinc-950 p-6 text-zinc-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Pulse</h1>
        <p className="mt-2 max-w-sm text-zinc-400">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-zinc-400">Your name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder="What should we call you?"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm text-zinc-400">Gender</legend>
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm transition ${
                  gender === opt.value
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <GenderIcon gender={opt.value} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        onClick={() => void enter()}
        disabled={!canEnter || status === "locating"}
        className="rounded-full bg-emerald-400 px-8 py-3 font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {status === "locating" ? "Locating…" : "Enter Pulse"}
      </button>

      {status === "error" && (
        <p className="max-w-sm text-center text-sm text-red-400">{error}</p>
      )}

      <p className="max-w-sm text-center text-xs text-zinc-500">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
    </div>
  );
}
