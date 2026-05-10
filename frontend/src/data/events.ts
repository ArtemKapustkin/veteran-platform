// Frontend "view model" for an event card. Built from the backend
// `ApiEvent` via `apiEventToAppEvent` (see `lib/api/mappers`). The static
// `EVENTS` array that used to live here is gone — every screen now pulls
// from the API. We keep `KYIV_CENTER` here because the map default needs
// to live somewhere shared.

import type { Person } from "./people";
import type { EventCategory } from "./categories";
import type { PhotoTone } from "@/components/atoms/Photo";
import type { EventRepeat } from "@/lib/api";

export interface AppEvent {
  /** UUID from the backend (`ApiEvent.id`). */
  id: string;
  category: EventCategory;
  coverTone: PhotoTone;
  title: string;
  /** Best-effort human address: venue, then street, then city. */
  place: string;
  /** Localized "Пт, 15 трав" derived from `starts_at`. */
  date: string;
  /** Localized "19:00" derived from `starts_at`. */
  time: string;
  /** Walking distance string. Empty when geolocation isn't available. */
  distance: string;
  badges: string[];
  /** Number of attendees so far (== `seats_taken`). */
  count: number;
  /** Total seats available (== `quota`). */
  capacity: number;
  /** Stub avatars — backend roster is organizer-only. */
  attendees: Person[];
  /** Subset of attendee names rendered after the count line. */
  attendeeNames: string[];
  description: string;
  /** Coordinates for MapLibre. Falls back to Kyiv center if absent. */
  location: { lat: number; lng: number };
  /**
   * Recurrence flag (`once`/`weekly`/etc). Mirrors `ApiEvent.repeat` —
   * carried through so the client-side "Регулярна" filter can run without
   * a second fetch.
   */
  repeat?: EventRepeat;
  /** Empty state — "+" pin, "Будь першим". */
  beFirst?: boolean;
}

export const KYIV_CENTER = { lat: 50.4501, lng: 30.5234 };
