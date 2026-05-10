"use client";

import { useMemo } from "react";
import type { AppEvent } from "@/data/events";
import type { EventListFilters } from "@/lib/api";
import { useEvents } from "@/lib/useEvents";
import { useCityStore } from "@/lib/useCity";
import { useMounted } from "@/lib/useMounted";
import {
  applyClientFilters,
  uiFiltersToApi,
  useFiltersStore,
  type UiFilters,
} from "@/lib/useFilters";

interface FilteredResult {
  events: AppEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Filter snapshot the API call was made with (debug-friendly). */
  apiFilters: EventListFilters;
  /** Active UI filters (passes through `useFiltersStore`). */
  ui: UiFilters;
}

/**
 * Fetch the public events list pre-filtered by the user's selected city
 * and the chips applied via `FiltersSheet`. Server-side filters go through
 * the `?city=`/`?category=`/etc. query string; "Регулярна" is applied
 * client-side because the backend `repeat` field can't express it.
 *
 * Renders an SSR-safe empty filter set on first paint — the persisted
 * stores haven't hydrated yet, and filtering on stale defaults would
 * cause a card flash on reload.
 */
export function useFilteredEvents(): FilteredResult {
  const mounted = useMounted();
  const city = useCityStore((s) => s.name);
  // Subscribe to every filter field so changes anywhere in the sheet
  // re-trigger the fetch. We slice into the store rather than calling
  // `getState()` because Zustand only re-renders subscribers via hooks.
  const categories = useFiltersStore((s) => s.categories);
  const forWhom = useFiltersStore((s) => s.forWhom);
  const costTiers = useFiltersStore((s) => s.costTiers);
  const districts = useFiltersStore((s) => s.districts);
  const accessibility = useFiltersStore((s) => s.accessibility);
  const participants = useFiltersStore((s) => s.participants);
  const repeat = useFiltersStore((s) => s.repeat);
  const isRegular = useFiltersStore((s) => s.isRegular);
  const datePreset = useFiltersStore((s) => s.datePreset);
  const customDate = useFiltersStore((s) => s.customDate);

  const ui: UiFilters = useMemo(
    () => ({
      categories,
      forWhom,
      costTiers,
      districts,
      accessibility,
      participants,
      repeat,
      isRegular,
      datePreset,
      customDate,
    }),
    [
      categories,
      forWhom,
      costTiers,
      districts,
      accessibility,
      participants,
      repeat,
      isRegular,
      datePreset,
      customDate,
    ],
  );

  const apiFilters: EventListFilters = useMemo(() => {
    if (!mounted) return {};
    return { city, ...uiFiltersToApi(ui) };
  }, [mounted, city, ui]);

  const { events, loading, error, refresh } = useEvents(
    mounted ? apiFilters : undefined,
  );

  const filtered = useMemo(
    () => (mounted ? applyClientFilters(events, ui) : events),
    [mounted, events, ui],
  );

  return { events: filtered, loading, error, refresh, apiFilters, ui };
}
