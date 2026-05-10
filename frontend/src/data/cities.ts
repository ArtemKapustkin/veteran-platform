// Static catalogue of supported cities. Mirrors the backend reference list
// at GET /api/v1/reference/cities, but we keep a typed copy here so the UI
// has the locative form ("Києві") and a map centroid for the camera fly-to
// without an extra round-trip on first paint.
//
// If the backend list ever drifts, the picker will still show the API
// response — `name` is the source of truth. The locative + centroid fall
// back gracefully (see helpers below).

export interface CityInfo {
  /** Canonical nominative (matches backend `cities` reference). */
  name: string;
  /** Locative case for headers: "Події у …". */
  locative: string;
  /** Approximate downtown coordinates for the map default view. */
  center: { lat: number; lng: number };
}

export const CITIES: readonly CityInfo[] = [
  { name: "Київ",      locative: "Києві",     center: { lat: 50.4501, lng: 30.5234 } },
  { name: "Львів",     locative: "Львові",    center: { lat: 49.8397, lng: 24.0297 } },
  { name: "Харків",    locative: "Харкові",   center: { lat: 49.9935, lng: 36.2304 } },
  { name: "Дніпро",    locative: "Дніпрі",    center: { lat: 48.4647, lng: 35.0462 } },
  { name: "Одеса",     locative: "Одесі",     center: { lat: 46.4825, lng: 30.7233 } },
  { name: "Запоріжжя", locative: "Запоріжжі", center: { lat: 47.8388, lng: 35.1396 } },
  { name: "Вінниця",   locative: "Вінниці",   center: { lat: 49.2331, lng: 28.4682 } },
];

export const DEFAULT_CITY: CityInfo = CITIES[0];

/** Radius (km) options shown next to the city in the picker. */
export const CITY_RADII: readonly number[] = [5, 10, 20, 50, 100];

export const DEFAULT_RADIUS_KM = 20;

export function findCity(name: string | null | undefined): CityInfo | undefined {
  if (!name) return undefined;
  return CITIES.find((c) => c.name === name);
}

/** Best-effort locative form. Falls back to the nominative if unknown. */
export function cityLocative(name: string): string {
  return findCity(name)?.locative ?? name;
}
