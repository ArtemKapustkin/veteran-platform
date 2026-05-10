"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CITIES,
  DEFAULT_CITY,
  DEFAULT_RADIUS_KM,
  findCity,
  type CityInfo,
} from "@/data/cities";

// User's currently-selected city + search radius. Drives the filter chip
// and headline in `DesktopFilterBar`, the `?city=` filter sent to the
// events API, and the initial map centroid.
//
// Persisted to localStorage so a returning user lands on their last city.
// The hook stays SSR-safe by always returning a hydrated default during
// the first render — components that read `name` / `radiusKm` directly
// will get `Київ + 20 км` server-side and switch to the persisted value
// once `useMounted()` flips.

interface CityState {
  name: string;
  radiusKm: number;
  setCity: (name: string) => void;
  setRadius: (km: number) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      name: DEFAULT_CITY.name,
      radiusKm: DEFAULT_RADIUS_KM,
      setCity: (name) => set({ name }),
      setRadius: (radiusKm) => set({ radiusKm }),
    }),
    {
      name: "svoi:city",
      storage: createJSONStorage(() => localStorage),
      // Coerce stale values back to safe defaults — the persisted name
      // could be a city we no longer ship, and we never want to render a
      // chip that points at nothing.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!findCity(state.name)) state.name = DEFAULT_CITY.name;
        if (!Number.isFinite(state.radiusKm) || state.radiusKm <= 0) {
          state.radiusKm = DEFAULT_RADIUS_KM;
        }
      },
    },
  ),
);

/**
 * Resolve the active city's static metadata (locative, centroid). Always
 * returns a value — falls back to `DEFAULT_CITY` if the persisted name no
 * longer matches a known city.
 */
export function resolveCity(name: string): CityInfo {
  return findCity(name) ?? DEFAULT_CITY;
}

export { CITIES };
