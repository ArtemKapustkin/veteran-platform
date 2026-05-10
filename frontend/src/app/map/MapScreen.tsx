"use client";

import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { FiltersButton } from "@/components/shared/FiltersButton";
import { MapCanvas } from "@/components/map/MapCanvas";
import { PinLayer } from "@/components/map/PinLayer";
import { Overlays } from "@/components/sheets/Overlays";
import { KYIV_CENTER } from "@/data/events";
import { useFilteredEvents } from "@/lib/useFilteredEvents";

export function MapScreen() {
  const params = useSearchParams();
  const focusedId = params.get("event");
  const { events } = useFilteredEvents();

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
        <PinLayer events={events} focusedId={focusedId} />
      </MapCanvas>

      {/* Top sticky chrome — header + view toggle */}
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
        <div className="pointer-events-auto mt-3 flex items-center justify-between px-4">
          <ViewToggle view="map" />
          <FiltersButton />
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="map" />
      </div>

      <Overlays showEventSheet />
    </main>
  );
}
