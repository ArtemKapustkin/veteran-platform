"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MapRef } from "react-map-gl/maplibre";
import { DesktopNav } from "./DesktopNav";
import { DesktopFilterBar } from "./DesktopFilterBar";
import { DesktopPinPreview } from "./DesktopPinPreview";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PinLayer } from "@/components/map/PinLayer";
import { Overlays } from "@/components/sheets/Overlays";
import { CATEGORIES } from "@/data/categories";
import { useFilteredEvents } from "@/lib/useFilteredEvents";
import { resolveCity, useCityStore } from "@/lib/useCity";
import { useMounted } from "@/lib/useMounted";

/** Zoom + animation tuning for the card → pin "fly to" effect. */
const FOCUS_ZOOM = 14;
const FOCUS_FLY_SPEED = 1.4;
/** Map zoom used whenever the camera is showing the whole city. */
const CITY_ZOOM = 11.4;

/**
 * LUN-style split view for desktop.
 *
 * - `listOnly` (used on /list): fills the cards grid across the whole content
 *   area and hides the right map column.
 * - Otherwise: 50/50 split — left is filters + cards grid, right is the
 *   sticky map. Clicking a pin or card sets `?event=<id>`, which focuses
 *   the pin and floats `DesktopPinPreview` over the bottom-left of the map.
 */
export function DesktopMapShell({
  listOnly = false,
}: {
  listOnly?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const focusedId = params.get("event");
  const mounted = useMounted();
  const cityName = useCityStore((s) => s.name);
  // Defer reading the persisted city until after hydration — otherwise SSR
  // and first-paint markup would diverge from the client store value.
  const activeCityName = mounted ? cityName : "Київ";
  const activeCity = resolveCity(activeCityName);
  const { events } = useFilteredEvents();
  const focused = focusedId
    ? events.find((e) => e.id === focusedId)
    : undefined;
  const mapRef = useRef<MapRef>(null);

  const onCardSelect = (id: string) => {
    // Stay in the split-view shell: just focus the pin via ?event=.
    // If we're on /list (listOnly), navigate to /map so the right column appears.
    const target = listOnly ? "/map" : window.location.pathname;
    router.push(`${target}?event=${id}`, { scroll: false });
  };

  // Smoothly fly the map to the focused pin whenever the selection changes.
  // `MapCanvas` only takes the lng/lat/zoom props as the *initial* view —
  // re-renders don't move the camera — so we drive the animation imperatively
  // via the MapRef. `essential: true` makes the fly happen even when the
  // user has prefers-reduced-motion (we still respect it via global CSS,
  // but MapLibre needs the explicit opt-in to animate at all).
  useEffect(() => {
    if (!focused) return;
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [focused.location.lng, focused.location.lat],
      zoom: FOCUS_ZOOM,
      speed: FOCUS_FLY_SPEED,
      essential: true,
    });
  }, [focused]);

  // Re-center the map when the user picks a different city. Jump rather
  // than fly — animating across hundreds of kilometers feels disorienting
  // and stalls the user. We compare against a ref of the previous city
  // so this only fires on an *actual* city change. In particular, closing
  // a focused event (focused → undefined) must NOT re-trigger this and
  // yank the camera back to CITY_ZOOM — we want to leave the map exactly
  // where the user last had it after they dismiss the pin preview.
  const prevCityRef = useRef(activeCity);
  useEffect(() => {
    if (prevCityRef.current === activeCity) return;
    prevCityRef.current = activeCity;
    const map = mapRef.current;
    if (!map) return;
    map.jumpTo({
      center: [activeCity.center.lng, activeCity.center.lat],
      zoom: CITY_ZOOM,
    });
  }, [activeCity]);

  return (
    <div className="bg-bg flex flex-col" style={{ height: "100vh" }}>
      <DesktopNav />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: filters + cards */}
        <section
          className="border-border-soft flex flex-col border-r bg-white"
          style={{
            flex: listOnly ? "1 1 0" : "0 0 50%",
            minWidth: 0,
          }}
        >
          <DesktopFilterBar />
          <div
            className="grid flex-1 content-start gap-4 overflow-auto px-7 pt-4 pb-7"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gridAutoRows: "min-content",
            }}
          >
            {events.map((e) => (
              <EventCardV2
                key={e.id}
                event={e}
                active={e.id === focusedId}
                onSelect={() => onCardSelect(e.id)}
              />
            ))}
          </div>
        </section>

        {/* RIGHT: sticky map */}
        {!listOnly ? (
          <section
            className="bg-map-bg relative"
            style={{ flex: "1 1 0", minWidth: 0 }}
          >
            <MapCanvas
              ref={mapRef}
              longitude={focused?.location.lng ?? activeCity.center.lng}
              latitude={focused?.location.lat ?? activeCity.center.lat}
              zoom={focused ? FOCUS_ZOOM : CITY_ZOOM}
            >
              <PinLayer events={events} focusedId={focusedId} />
            </MapCanvas>

            <div
              aria-hidden
              className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full px-3.5 py-2 backdrop-blur-md"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "var(--shadow-soft)",
                fontSize: 12,
              }}
            >
              <span
                className="inline-block h-[9px] w-[9px] rounded-[5px]"
                style={{ background: CATEGORIES.sport.color }}
              />
              <span className="text-text2 font-medium">Спорт</span>
              <span
                className="ml-2 inline-block h-[9px] w-[9px] rounded-[5px]"
                style={{ background: CATEGORIES.culture.color }}
              />
              <span className="text-text2 font-medium">Культура</span>
              <span
                className="ml-2 inline-block h-[9px] w-[9px] rounded-[5px]"
                style={{ background: CATEGORIES.social.color }}
              />
              <span className="text-text2 font-medium">Соціальне</span>
            </div>

            {focused ? <DesktopPinPreview event={focused} /> : null}
          </section>
        ) : null}
      </div>

      {/* Filters / a11y overlays — `showEventSheet` is OFF on desktop because
          the focused event is rendered as DesktopPinPreview instead.
          `desktop` flips Filters into a slide-in 480px panel. */}
      <Overlays desktop />
    </div>
  );
}
