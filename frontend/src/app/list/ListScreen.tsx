"use client";

import { AppHeader } from "@/components/shared/AppHeader";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { FiltersButton } from "@/components/shared/FiltersButton";
import { Overlays } from "@/components/sheets/Overlays";
import { useFilteredEvents } from "@/lib/useFilteredEvents";

export function ListScreen() {
  const { events, loading, error } = useFilteredEvents();

  return (
    <main
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="pt-3 pb-2">
        <AppHeader />
        <div className="mt-3 flex items-center justify-between gap-2 px-4">
          <ViewToggle view="list" />
          <FiltersButton />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 pt-2 pb-28">
        {error ? (
          <ListMessage>Не вдалось завантажити події. {error}</ListMessage>
        ) : loading && events.length === 0 ? (
          <ListMessage>Завантажуємо події…</ListMessage>
        ) : events.length === 0 ? (
          <ListMessage>Поки що немає опублікованих подій.</ListMessage>
        ) : (
          <div className="flex flex-col gap-3.5">
            {events.map((e) => (
              <EventCardV2 key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="list" />
      </div>

      <Overlays />
    </main>
  );
}

function ListMessage({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-text2 mt-10 text-center"
      style={{ fontSize: 14 }}
    >
      {children}
    </div>
  );
}
