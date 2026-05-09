// Convert the organizer's draft (which holds Ukrainian-labelled radio
// values matching the visual mockup) into the canonical `EventCreatePayload`
// the backend speaks. Best-effort — any label we don't recognise falls
// through to a sensible default so a partially-filled draft still lands
// on the backend instead of throwing client-side.

import { eventsApi } from "@/lib/api";
import type {
  AccessibilityTag,
  ApiEventCategory,
  ApiEventDetail,
  CostTier,
  EventCreatePayload,
  ForWhom,
  KyivDistrict,
} from "@/lib/api/types";
import type { EventDraft, FormCategoryId } from "./draft";

const CATEGORY_MAP: Record<FormCategoryId, ApiEventCategory> = {
  sport:   "sport",
  yoga:    "yoga",
  culture: "culture",
  study:   "education",
  nature:  "nature",
  psy:     "psychology",
  social:  "social",
  rehab:   "rehabilitation",
  spa:     "spa",
};

const AUDIENCE_MAP: Record<string, ForWhom> = {
  "Захисники і їх сімʼї":         "veterans_and_families",
  "Лише захисники":               "veterans",
  "Тільки захисниці (жінки)":     "female_veterans",
  "Тільки захисники (чоловіки)":  "male_veterans",
};

const PRICE_MAP: Record<string, CostTier> = {
  "Безкоштовно для всіх":               "free_for_all",
  "Безкоштовно для ветеранів та родин": "free_for_veterans_and_families",
  "Безкоштовно для УБД":                "free_for_ubd",
  "Через держпрограму":                 "free_via_state_program",
  "Знижка для ветеранів":               "discount_for_veterans",
  "Платно":                             "paid",
};

const COMFORT_MAP: Record<string, AccessibilityTag> = {
  "Поруч укриття":      "shelter_nearby",
  "Без зйомки":         "no_shooting",
  "Адаптивний простір": "is_accessible",
  "18+":                "age_18_plus",
};

const REGION_MAP: Record<string, KyivDistrict> = {
  "Голосіївський":   "holosiivskyi",
  "Оболонський":     "obolonskyi",
  "Печерський":      "pecherskyi",
  "Подільський":     "podilskyi",
  "Святошинський":   "sviatoshynskyi",
  "Соломʼянський":   "solomianskyi",
  "Шевченківський":  "shevchenkivskyi",
  "Дарницький":      "darnytskyi",
  "Деснянський":     "desnianskyi",
  "Дніпровський":    "dniprovskyi",
};

/**
 * Combine the form's separate `date` (YYYY-MM-DD or DD.MM-style) and
 * `time` (HH:MM) inputs into an ISO timestamp. Falls back to "now + 1 day"
 * so a partially-filled draft still validates against the API's required
 * `starts_at` field — the organizer can edit it after approval.
 */
function combineDateTime(date: string, time: string): string {
  const fallback = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const trimmed = date.trim();
  if (!trimmed) return fallback.toISOString();
  // ISO date input: 2026-06-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const t = time.trim() || "12:00";
    return new Date(`${trimmed}T${t}:00`).toISOString();
  }
  // Ukrainian "DD.MM" — assume current/next year that keeps it future.
  const m = trimmed.match(/^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const yearRaw = m[3];
    const yyyy = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : new Date().getFullYear();
    const t = (time.trim() || "12:00").padStart(5, "0");
    const d = new Date(yyyy, month, day, Number(t.slice(0, 2)), Number(t.slice(3, 5)));
    if (d.getTime() < Date.now()) d.setFullYear(yyyy + 1);
    return d.toISOString();
  }
  return fallback.toISOString();
}

function parseQuota(draft: EventDraft): number {
  const q = parseInt(draft.quota, 10);
  if (!Number.isNaN(q) && q > 0) return q;
  const c = parseInt(draft.capacity, 10);
  if (!Number.isNaN(c) && c > 0) return c;
  return 1;
}

export function draftToCreatePayload(draft: EventDraft): EventCreatePayload {
  const starts = combineDateTime(draft.date, draft.time);
  const tier = PRICE_MAP[draft.price] ?? "free_for_all";

  const accessibility = Array.from(draft.comfort)
    .map((c) => COMFORT_MAP[c])
    .filter((tag): tag is AccessibilityTag => Boolean(tag));

  const district = REGION_MAP[draft.region];
  const location = draft.place || draft.region
    ? {
        city: "Київ",
        district,
        address: draft.place || undefined,
      }
    : undefined;

  return {
    category: CATEGORY_MAP[draft.catId] ?? "social",
    title: draft.title.trim() || "Без назви",
    description: draft.desc.trim() || undefined,
    quota: parseQuota(draft),
    starts_at: starts,
    format: "offline",
    repeat: draft.recurrence === "Регулярна" ? "weekly" : "once",
    for_whom: AUDIENCE_MAP[draft.audience] ?? "veterans",
    cost: { tier },
    accessibility_tags: accessibility,
    verified_only: false,
    location,
  };
}

export async function submitDraft(draft: EventDraft): Promise<ApiEventDetail> {
  const payload = draftToCreatePayload(draft);
  return eventsApi.create(payload);
}
