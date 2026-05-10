// Display metadata for the 9 backend `EventCategory` values. The 3-value
// pin palette (green/blue/amber) the original prototype used is now folded
// in via `pinColor`, so any new category gets a sensible default without
// touching the map renderer.

import type { ApiEventCategory } from "@/lib/api/types";

export type EventCategory = ApiEventCategory;

export interface CategoryMeta {
  /** Brand-aligned hex used in legend chips and on the swatch. */
  color: string;
  /** Logical bucket the map pin renders in (only 3 colors exist). */
  pinColor: "green" | "blue" | "amber";
  /** Ukrainian short label shown in pills and chips. */
  label: string;
}

export const CATEGORIES: Record<EventCategory, CategoryMeta> = {
  sport:          { color: "#34D399", pinColor: "green", label: "Спорт" },
  yoga:           { color: "#5EBE9C", pinColor: "green", label: "Йога і медитація" },
  rehabilitation: { color: "#48B373", pinColor: "green", label: "Реабілітація" },
  culture:        { color: "#60A5FA", pinColor: "blue",  label: "Культура" },
  education:      { color: "#7DA9F0", pinColor: "blue",  label: "Навчання" },
  spa:            { color: "#9DB7E6", pinColor: "blue",  label: "СПА і відновлення" },
  social:         { color: "#F59E0B", pinColor: "amber", label: "Зустрічі і спілкування" },
  psychology:     { color: "#EAB258", pinColor: "amber", label: "Психологічна підтримка" },
  nature:         { color: "#D89A60", pinColor: "amber", label: "Природа і тури" },
};

/** Fallback when the API ships a category the SPA enum has not caught up with yet. */
const UNKNOWN_CATEGORY_META: CategoryMeta = {
  color: "#9CA3AF",
  pinColor: "amber",
  label: "Подія",
};

export function categoryMeta(category: string | undefined | null): CategoryMeta {
  if (category != null && category in CATEGORIES) {
    return CATEGORIES[category as EventCategory];
  }
  return UNKNOWN_CATEGORY_META;
}

export const CATEGORY_LIST: { code: EventCategory; label: string }[] = (
  Object.entries(CATEGORIES) as [EventCategory, CategoryMeta][]
).map(([code, meta]) => ({ code, label: meta.label }));
