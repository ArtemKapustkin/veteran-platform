"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { AddEventFab } from "@/components/shared/AddEventFab";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PinLayer } from "@/components/map/PinLayer";
import { Overlays } from "@/components/sheets/Overlays";
import { FilterIcon } from "@/components/icons";
import { EVENTS, KYIV_CENTER } from "@/data/events";

export function MapScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const focusedId = params.get("event") ? Number(params.get("event")) : null;

  const onFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("filters", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <main
      aria-label="Карта подій"
      className="bg-bg relative overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <MapCanvas
        longitude={KYIV_CENTER.lng}
        latitude={KYIV_CENTER.lat}
        zoom={11.4}
      >
        <PinLayer events={EVENTS} focusedId={focusedId} />
      </MapCanvas>

      {/* Top sticky chrome — header, search, view toggle */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-3 pb-1.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(250,250,247,0.95) 0%, rgba(250,250,247,0.7) 70%, rgba(250,250,247,0) 100%)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="pointer-events-auto">
          <AppHeader />
        </div>
        <div className="pointer-events-auto px-4 pt-2">
          <SearchBar />
        </div>
        <div className="pointer-events-auto flex items-center justify-between px-4 pt-3">
          <ViewToggle view="map" />
          <button
            type="button"
            onClick={onFilters}
            aria-label="Відкрити фільтри"
            className="bg-surface text-text flex items-center gap-1.5 rounded-full px-3.5 py-2 shadow-soft"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            <FilterIcon size={14} />
            Фільтри
          </button>
        </div>
      </div>

      <AddEventFab />

      {/* Bottom toolbar */}
      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="map" />
      </div>

      <Overlays showEventSheet />
    </main>
  );
}
