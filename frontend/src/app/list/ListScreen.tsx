"use client";

import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/shared/AppHeader";
import { SearchBar } from "@/components/shared/SearchBar";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { AddEventFab } from "@/components/shared/AddEventFab";
import { Overlays } from "@/components/sheets/Overlays";
import { FilterIcon } from "@/components/icons";
import { useEvents } from "@/lib/useEvents";

export function ListScreen() {
  const router = useRouter();
  const { events, loading, error } = useEvents();

  const onFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("filters", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <main
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="pt-3 pb-2">
        <AppHeader />
        <div className="px-4 pt-2">
          <SearchBar />
        </div>
        <div className="mt-3.5 flex items-center justify-between gap-2 px-4">
          <ViewToggle view="list" />
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

      <AddEventFab />

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
