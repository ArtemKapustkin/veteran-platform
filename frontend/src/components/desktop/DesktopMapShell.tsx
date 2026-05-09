"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DesktopNav } from "./DesktopNav";
import { DesktopFilterBar } from "./DesktopFilterBar";
import { DesktopHeader } from "./DesktopHeader";
import { DesktopPinPreview } from "./DesktopPinPreview";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PinLayer } from "@/components/map/PinLayer";
import { Overlays } from "@/components/sheets/Overlays";
import { CATEGORIES } from "@/data/categories";
import { EVENTS, KYIV_CENTER, getEventById } from "@/data/events";

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
  const eventIdParam = params.get("event");
  const focusedId = eventIdParam ? Number(eventIdParam) : null;
  const focused = focusedId != null ? getEventById(focusedId) : undefined;

  const onCardSelect = (id: number) => {
    // Stay in the split-view shell: just focus the pin via ?event=.
    // If we're on /list (listOnly), navigate to /map so the right column appears.
    const target = listOnly ? "/map" : window.location.pathname;
    router.push(`${target}?event=${id}`, { scroll: false });
  };

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
          <DesktopHeader />
          <div
            className="grid flex-1 content-start gap-4 overflow-auto px-7 pt-3 pb-7"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gridAutoRows: "min-content",
            }}
          >
            {EVENTS.map((e) => (
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
              longitude={focused?.location.lng ?? KYIV_CENTER.lng}
              latitude={focused?.location.lat ?? KYIV_CENTER.lat}
              zoom={focused ? 13 : 11.4}
            >
              <PinLayer events={EVENTS} focusedId={focusedId} />
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
