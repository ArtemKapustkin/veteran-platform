"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Marker,
  type MapLayerMouseEvent,
  type MapRef,
  type MarkerDragEvent,
} from "react-map-gl/maplibre";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PinIcon } from "@/components/icons";
import { KYIV_CENTER } from "@/data/events";

// ─── Geocoding (OpenStreetMap Nominatim) ──────────────
//
// Nominatim is the only free, no-key public geocoder we can call from the
// browser. The usage policy asks us to throttle to ~1 req/s and to identify
// the app via Referer (the browser sends it automatically). We debounce
// input changes to 350ms and bound the result list to Ukraine so the
// suggestions stay relevant.

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_LIMIT = 6;

interface Suggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

async function searchPlaces(
  query: string,
  signal: AbortSignal,
): Promise<Suggestion[]> {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(SEARCH_LIMIT));
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "ua");
  url.searchParams.set("accept-language", "uk");

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = (await res.json()) as NominatimResult[];
  return data.map((r) => ({
    id: String(r.place_id),
    label: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
  }));
}

/**
 * Resolve a (lat,lng) into a human address using Nominatim's reverse
 * endpoint. Returns null if the network/parse fails — callers keep the
 * previous address rather than blanking the input.
 */
async function reverseGeocode(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<string | null> {
  const url = new URL(NOMINATIM_REVERSE_URL);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("accept-language", "uk");

  const res = await fetch(url.toString(), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name ?? null;
}

// ─── Component ────────────────────────────────────────

const INPUT_CLASS =
  "border-border focus:border-primary text-text w-full rounded-[10px] border bg-white px-3.5 py-2.5 outline-none transition-colors placeholder:text-[var(--color-text-muted)]";

export interface LocationValue {
  place: string;
  lat: number | null;
  lng: number | null;
}

export function LocationPicker({
  place,
  lat,
  lng,
  onChange,
  inputId,
}: {
  place: string;
  lat: number | null;
  lng: number | null;
  onChange: (value: LocationValue) => void;
  inputId?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  // Each map click/drag aborts any in-flight reverse-geocode so the latest
  // request is always the one that wins.
  const reverseCtrlRef = useRef<AbortController | null>(null);
  // Tracks the most recently-fetched (lat,lng) so a stale reverse-geocode
  // resolved after the user kept dragging doesn't overwrite the address.
  const lastReverseTargetRef = useRef<{ lat: number; lng: number } | null>(
    null,
  );

  const hasPin = lat != null && lng != null;
  const center = useMemo(
    () => ({
      lng: lng ?? KYIV_CENTER.lng,
      lat: lat ?? KYIV_CENTER.lat,
    }),
    [lat, lng],
  );

  // Debounced suggestions fetch — only when the user is actively typing.
  // We schedule all `setState` calls inside the timer callback so we don't
  // trigger cascading renders synchronously from the effect body.
  useEffect(() => {
    if (!open) return;
    const q = place.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    let active = true;
    const id = window.setTimeout(() => {
      if (!active) return;
      setBusy(true);
      searchPlaces(q, ctrl.signal)
        .then((results) => {
          if (active) setItems(results);
        })
        .catch((err) => {
          if (active && (err as Error).name !== "AbortError") setItems([]);
        })
        .finally(() => {
          if (active) setBusy(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      window.clearTimeout(id);
      ctrl.abort();
    };
  }, [place, open]);

  // Whether the dropdown should be visible given the *current* query.
  // Derived (not stored) so we don't show stale items after the user
  // shortens the query below the 3-char threshold.
  const queryLongEnough = place.trim().length >= 3;
  const showList = open && queryLongEnough && (busy || items.length > 0);

  // Close the suggestions dropdown when the user clicks/taps outside.
  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [open]);

  // Smoothly recenter the map whenever the marker moves to a new spot
  // (autocomplete pick or marker drag).
  useEffect(() => {
    if (!hasPin) return;
    const m = mapRef.current;
    if (!m) return;
    m.flyTo({
      center: [lng as number, lat as number],
      zoom: 14,
      speed: 1.6,
      essential: true,
    });
  }, [hasPin, lat, lng]);

  const pickSuggestion = useCallback(
    (s: Suggestion) => {
      onChange({ place: s.label, lat: s.lat, lng: s.lng });
      setItems([]);
      setOpen(false);
    },
    [onChange],
  );

  // Programmatic marker move (map click / marker drag).
  //
  // 1. Optimistically update lat/lng so the marker snaps where the user
  //    clicked, even if the reverse-geocode is slow or fails.
  // 2. Close the suggestions dropdown — the autocomplete fetch effect is
  //    gated on `open`, so it stays quiet while we resolve the address.
  // 3. Reverse-geocode in the background; once it returns, replace the
  //    address line with the resolved label (only if the marker hasn't
  //    moved again since).
  const moveMarker = useCallback(
    (nextLng: number, nextLat: number) => {
      onChange({ place, lat: nextLat, lng: nextLng });
      setOpen(false);

      reverseCtrlRef.current?.abort();
      const ctrl = new AbortController();
      reverseCtrlRef.current = ctrl;
      lastReverseTargetRef.current = { lat: nextLat, lng: nextLng };

      reverseGeocode(nextLat, nextLng, ctrl.signal)
        .then((label) => {
          if (!label) return;
          // Bail if the marker moved again while we were waiting.
          const target = lastReverseTargetRef.current;
          if (
            !target ||
            target.lat !== nextLat ||
            target.lng !== nextLng
          ) {
            return;
          }
          onChange({ place: label, lat: nextLat, lng: nextLng });
        })
        .catch(() => {
          // Network / abort errors are non-fatal — the user keeps the
          // marker where they put it; only the address line lags.
        });
    },
    [onChange, place],
  );

  // Abort any in-flight reverse-geocode when the picker unmounts so we
  // don't trigger an `onChange` against a torn-down parent.
  useEffect(() => {
    return () => reverseCtrlRef.current?.abort();
  }, []);

  const onMapClick = useCallback(
    (e: MapLayerMouseEvent) => moveMarker(e.lngLat.lng, e.lngLat.lat),
    [moveMarker],
  );

  const onMarkerDragEnd = useCallback(
    (e: MarkerDragEvent) => moveMarker(e.lngLat.lng, e.lngLat.lat),
    [moveMarker],
  );

  return (
    <div className="flex flex-col gap-2.5" ref={wrapperRef}>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={place}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange({ place: e.target.value, lat, lng });
            setOpen(true);
          }}
          onKeyDown={(e) => {
            // Enter picks the top suggestion without forcing the user to
            // mouse over the dropdown — mirrors how /map → input flows.
            if (e.key === "Enter" && showList && items.length > 0) {
              e.preventDefault();
              pickSuggestion(items[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Кінотеатр Жовтень, Поділ"
          className={INPUT_CLASS}
          style={{ fontSize: 14 }}
        />

        {showList ? (
          <div
            id={listboxId}
            role="listbox"
            className="border-border-soft bg-surface absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-[10px] border shadow-md"
          >
            {busy && items.length === 0 ? (
              <div
                className="text-text2 px-3.5 py-2.5"
                style={{ fontSize: 13 }}
              >
                Шукаємо…
              </div>
            ) : (
              items.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pickSuggestion(s)}
                  className="hover:bg-bg flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors"
                >
                  <PinIcon size={14} />
                  <span
                    className="text-text"
                    style={{ fontSize: 13, lineHeight: 1.4 }}
                  >
                    {s.label}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div
        className="border-border-soft relative w-full overflow-hidden rounded-[12px] border"
        style={{ height: 220 }}
      >
        <MapCanvas
          ref={mapRef}
          longitude={center.lng}
          latitude={center.lat}
          zoom={hasPin ? 14 : 11.4}
          onClick={onMapClick}
        >
          {hasPin ? (
            <Marker
              longitude={lng as number}
              latitude={lat as number}
              anchor="bottom"
              draggable
              onDragEnd={onMarkerDragEnd}
            >
              <MapPinDot />
            </Marker>
          ) : null}
        </MapCanvas>
        {!hasPin ? (
          <div
            className="text-text2 pointer-events-none absolute left-3 bottom-3 rounded-[10px] px-3 py-1.5 backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.92)",
              fontSize: 12,
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            Натисни на карту, щоб поставити точку
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MapPinDot() {
  return (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-full"
      style={{
        width: 30,
        height: 30,
        background: "var(--color-primary)",
        color: "#fff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
        transform: "translateY(4px)",
        border: "3px solid #fff",
      }}
    >
      <PinIcon size={13} />
    </div>
  );
}
