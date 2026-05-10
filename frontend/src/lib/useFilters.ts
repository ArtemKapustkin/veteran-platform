"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppEvent } from "@/data/events";
import type {
  AccessibilityTag,
  ApiEventCategory,
  CostTier,
  EventListFilters,
  EventRepeat,
  ForWhom,
  KyivDistrict,
  ParticipantsBucket,
} from "@/lib/api";

// ─── UI shape ─────────────────────────────────────────────────
//
// `UiFilters` is the shape produced by the `FiltersSheet` chip groups.
// Each section maps onto either a backend query param (most cases) or a
// client-side post-filter (`isRegular`, since the API can express
// "repeat=once" but not "any non-once").
//
// `for_whom` is single-select in the UI but stored as an array because
// the backend takes `for_whom[]` — keeping it as an array lets us extend
// the chip group to multi without touching the mapper.

export type DatePreset = "today" | "tomorrow" | "this_week" | "this_month";

export interface UiFilters {
  categories: ApiEventCategory[];
  forWhom: ForWhom[];
  costTiers: CostTier[];
  districts: KyivDistrict[];
  accessibility: AccessibilityTag[];
  participants: ParticipantsBucket | null;
  /**
   * "Одноразова" → "once" (handled server-side via `repeat=once`).
   * Mutually exclusive with `isRegular`.
   */
  repeat: EventRepeat | null;
  /**
   * "Регулярна" — backend `repeat` only takes one literal value, so we
   * filter client-side after fetching (keep events whose `repeat` is not
   * "once"). Mutually exclusive with `repeat`.
   */
  isRegular: boolean;
  datePreset: DatePreset | null;
  /** Free-form custom date entered via the "Вибрати дату" chip. */
  customDate: string | null;
}

export const EMPTY_FILTERS: UiFilters = {
  categories: [],
  forWhom: [],
  costTiers: [],
  districts: [],
  accessibility: [],
  participants: null,
  repeat: null,
  isRegular: false,
  datePreset: null,
  customDate: null,
};

interface FiltersState extends UiFilters {
  /** Replace the whole filter set (called from the sheet's "Apply" button). */
  setFilters: (next: UiFilters) => void;
  /** Reset every chip — used by the sheet's reset button and on logout. */
  clear: () => void;
}

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...EMPTY_FILTERS,
      setFilters: (next) => set(next),
      clear: () => set(EMPTY_FILTERS),
    }),
    {
      name: "svoi:filters",
      storage: createJSONStorage(() => localStorage),
      // Don't persist actions — only the data fields. `partialize` strips
      // the function references so the restored object passes JSON.parse
      // without losing them on rehydrate (Zustand merges back the actions).
      partialize: (s) => ({
        categories: s.categories,
        forWhom: s.forWhom,
        costTiers: s.costTiers,
        districts: s.districts,
        accessibility: s.accessibility,
        participants: s.participants,
        repeat: s.repeat,
        isRegular: s.isRegular,
        datePreset: s.datePreset,
        customDate: s.customDate,
      }),
    },
  ),
);

/** Snapshot the current filters for use in a draft (sheet open). */
export function snapshotFilters(): UiFilters {
  const s = useFiltersStore.getState();
  return {
    categories: [...s.categories],
    forWhom: [...s.forWhom],
    costTiers: [...s.costTiers],
    districts: [...s.districts],
    accessibility: [...s.accessibility],
    participants: s.participants,
    repeat: s.repeat,
    isRegular: s.isRegular,
    datePreset: s.datePreset,
    customDate: s.customDate,
  };
}

// ─── Active count ─────────────────────────────────────────────

export function countActiveFilters(f: UiFilters): number {
  return (
    f.categories.length +
    f.forWhom.length +
    f.costTiers.length +
    f.districts.length +
    f.accessibility.length +
    (f.participants ? 1 : 0) +
    (f.repeat ? 1 : 0) +
    (f.isRegular ? 1 : 0) +
    (f.datePreset ? 1 : 0) +
    (f.customDate ? 1 : 0)
  );
}

// ─── Date helpers ─────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function endOfWeek(d: Date): Date {
  // Treat Monday as week start (Ukraine convention). `getDay()` returns
  // 0 for Sunday; nudge to 7 so end-of-week is the upcoming Sunday.
  const x = endOfDay(d);
  const dow = x.getDay() || 7;
  x.setDate(x.getDate() + (7 - dow));
  return x;
}

function endOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function datePresetRange(p: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (p) {
    case "today":
      return { from: now, to: endOfDay(now) };
    case "tomorrow": {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      return { from: startOfDay(t), to: endOfDay(t) };
    }
    case "this_week":
      return { from: now, to: endOfWeek(now) };
    case "this_month":
      return { from: now, to: endOfMonth(now) };
  }
}

/**
 * Parse a free-form date entry. Accepts:
 *   "15.05"          — single day (current year)
 *   "15.05.26"       — single day with two-digit year suffix
 *   "13-17.05"       — range within one month
 *   "13–17.05"       — same with en-dash
 * Returns `null` when the input is too unstructured to map into a range.
 *
 * Tolerant on purpose: months/days are clamped, year defaults to "current
 * or next" so "15.05" in November means next May, not the past.
 */
export function parseCustomDate(input: string): { from: Date; to: Date } | null {
  const raw = input.trim();
  if (!raw) return null;

  // Range form: "13-17.05" or "13–17.05"
  const range = /^(\d{1,2})\s*[–-]\s*(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.\s*(\d{2,4}))?$/.exec(raw);
  if (range) {
    const d1 = clampDay(parseInt(range[1], 10));
    const d2 = clampDay(parseInt(range[2], 10));
    const m = clampMonth(parseInt(range[3], 10));
    const y = inferYear(parseInt(range[4] ?? "0", 10), m, d1);
    if (d1 > d2) return null;
    return {
      from: startOfDay(new Date(y, m - 1, d1)),
      to: endOfDay(new Date(y, m - 1, d2)),
    };
  }

  // Single day: "15.05" or "15.05.26"
  const single = /^(\d{1,2})\s*\.\s*(\d{1,2})(?:\s*\.\s*(\d{2,4}))?$/.exec(raw);
  if (single) {
    const d = clampDay(parseInt(single[1], 10));
    const m = clampMonth(parseInt(single[2], 10));
    const y = inferYear(parseInt(single[3] ?? "0", 10), m, d);
    return {
      from: startOfDay(new Date(y, m - 1, d)),
      to: endOfDay(new Date(y, m - 1, d)),
    };
  }

  return null;
}

function clampDay(d: number): number {
  return Math.min(31, Math.max(1, d || 1));
}

function clampMonth(m: number): number {
  return Math.min(12, Math.max(1, m || 1));
}

function inferYear(raw: number, month: number, day: number): number {
  const now = new Date();
  if (raw >= 100) return raw;
  if (raw > 0) return 2000 + raw;
  // No year given — pick the upcoming occurrence of (month, day).
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  if (thisYear.getTime() < startOfDay(now).getTime()) {
    return now.getFullYear() + 1;
  }
  return now.getFullYear();
}

// ─── Mapping ──────────────────────────────────────────────────

/**
 * Translate the UI filter state into the closed `EventListFilters` shape
 * the `useEvents()` hook understands. `isRegular` is intentionally NOT
 * mapped — it's applied client-side via `applyClientFilters` because the
 * backend can't express "any non-once" in a single `repeat=` value.
 */
export function uiFiltersToApi(f: UiFilters): EventListFilters {
  const out: EventListFilters = {};
  if (f.categories.length) out.category = f.categories;
  if (f.forWhom.length) out.for_whom = f.forWhom;
  if (f.costTiers.length) out.cost = f.costTiers;
  if (f.districts.length) out.district = f.districts;
  if (f.accessibility.length) out.accessibility_tags = f.accessibility;
  if (f.participants) out.participants_bucket = f.participants;
  if (f.repeat && !f.isRegular) out.repeat = f.repeat;

  if (f.customDate) {
    const range = parseCustomDate(f.customDate);
    if (range) {
      out.date_from = range.from.toISOString();
      out.date_to = range.to.toISOString();
    }
  } else if (f.datePreset) {
    const { from, to } = datePresetRange(f.datePreset);
    out.date_from = from.toISOString();
    out.date_to = to.toISOString();
  }

  // Browse list / map should never show events that have already started.
  // (`Saved` and other callers use `useEvents()` without these filters.)
  mergeUpcomingStartsFloor(out);

  return out;
}

/**
 * Clamp `date_from` so `starts_at >= now` (backend: `ListFilters.DateFrom`).
 * If the user picked a range that starts in the past (e.g. earlier today or
 * a historical custom range), we still only request upcoming occurrences.
 */
function mergeUpcomingStartsFloor(out: EventListFilters): void {
  const now = Date.now();
  const floorIso = new Date(now).toISOString();
  if (!out.date_from) {
    out.date_from = floorIso;
    return;
  }
  const fromMs = new Date(out.date_from).getTime();
  if (!Number.isFinite(fromMs) || fromMs < now) {
    out.date_from = floorIso;
  }
}

/**
 * Run the post-fetch filters that the API can't express. Today this only
 * covers "Регулярна" — keep events whose `repeat` is anything but "once"
 * (and exclude events with no `repeat` at all so unknown rows don't sneak
 * into a "regular only" view).
 */
export function applyClientFilters(events: AppEvent[], f: UiFilters): AppEvent[] {
  if (!f.isRegular) return events;
  return events.filter((e) => e.repeat != null && e.repeat !== "once");
}
