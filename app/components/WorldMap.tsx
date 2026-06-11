"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { Gender, PeerDot } from "@/lib/types";
import { genderIconHtml } from "@/app/components/GenderIcon";
import { moodDisplay } from "@/lib/moodDisplay";
import { genderColor, peerDisplayName } from "@/lib/peerDisplay";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const STYLE = process.env.NEXT_PUBLIC_MAPBOX_STYLE;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function peerLabelHtml(name: string, gender: Gender, mood = ""): string {
  const moodSuffix = mood ? ` · ${escapeHtml(moodDisplay(mood))}` : "";
  return `<span class="pulse-dot-label">${genderIconHtml(gender)} ${escapeHtml(peerDisplayName(name))}${moodSuffix}</span>`;
}

function mePinHtml(): string {
  return `<span class="pulse-me-pin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" fill="currentColor" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/><circle cx="12" cy="10" r="2.5" fill="var(--bg-base)"/></svg></span>`;
}

export default function WorldMap({
  peers,
  me,
  onPeerClick,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number; name: string; gender: Gender } | null;
  onPeerClick: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Marker click handlers are bound once, so read the live click handler +
  // connectability through refs (synced in an effect, never during render).
  const onPeerClickRef = useRef(onPeerClick);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
  });

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !STYLE || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: STYLE,
        // Open centered on the user if we know where they are, else world view.
        center: me ? [me.lng, me.lat] : [0, 20],
        zoom: me ? 4 : 1.4,
        attributionControl: true,
      });
      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // `me` is only read for the initial center; we don't want to re-init on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show / move the user's own "you are here" pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const label = peerLabelHtml("Me", me.gender);
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = "You are here";
        el.innerHTML = `${label}${mePinHtml()}`;
        // anchor "bottom" → the pin's tip sits on the exact coordinate.
        meMarkerRef.current = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
        const labelEl = meMarkerRef.current
          .getElement()
          .querySelector(".pulse-dot-label");
        if (labelEl) labelEl.outerHTML = label;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, ready]);

  // Reconcile markers whenever the peer list changes (or the map becomes ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.color = genderColor(peer.gender);
          const moodLabel = moodDisplay(peer.mood);
          el.title = moodLabel
            ? `Tap to connect with ${peerDisplayName(peer.name)} (${moodLabel})`
            : `Tap to connect with ${peerDisplayName(peer.name)}`;
          el.innerHTML = peerLabelHtml(peer.name, peer.gender, peer.mood);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onPeerClickRef.current(peer.id);
          });
          marker = new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        } else {
          const el = marker.getElement();
          el.style.color = genderColor(peer.gender);
          const moodLabel = moodDisplay(peer.mood);
          el.title = moodLabel
            ? `Tap to connect with ${peerDisplayName(peer.name)} (${moodLabel})`
            : `Tap to connect with ${peerDisplayName(peer.name)}`;
          el.innerHTML = peerLabelHtml(peer.name, peer.gender, peer.mood);
        }
        marker.getElement().style.opacity = peer.busy ? "0.35" : "1";
      }

      // Drop markers for peers that went offline / got filtered out.
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full bg-zinc-900" />

      {(!TOKEN || !STYLE) && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">
            Set{" "}
            {!TOKEN && (
              <>
                <code className="text-emerald-400">
                  NEXT_PUBLIC_MAPBOX_TOKEN
                </code>
                {!STYLE ? " and " : " "}
              </>
            )}
            {!STYLE && (
              <code className="text-emerald-400">NEXT_PUBLIC_MAPBOX_STYLE</code>
            )}{" "}
            in <code>.env</code> to load the map.
          </p>
        </div>
      )}
    </div>
  );
}
