import type { PhotoTone } from "@/components/atoms/Photo";
import type { EventCategory } from "@/data/categories";

// ─── Form-level taxonomy ──────────────────────────────
//
// The "Add event" form exposes a richer category list (9 buckets) than the
// 3-bucket card category used elsewhere in the app. We keep the rich list
// for the form UI, then collapse it into the existing `EventCategory` enum
// when rendering badges / pin colors in the live preview.

export type FormCategoryId =
  | "sport"
  | "yoga"
  | "culture"
  | "study"
  | "nature"
  | "psy"
  | "social"
  | "rehab"
  | "spa";

export interface FormCategory {
  id: FormCategoryId;
  label: string;
}

export const CATEGORIES_LIST: readonly FormCategory[] = [
  { id: "sport",   label: "Спорт" },
  { id: "yoga",    label: "Йога і медитація" },
  { id: "culture", label: "Культура" },
  { id: "study",   label: "Навчання" },
  { id: "nature",  label: "Природа і тури" },
  { id: "psy",     label: "Психологічна підтримка" },
  { id: "social",  label: "Зустрічі і спілкування" },
  { id: "rehab",   label: "Реабілітація" },
  { id: "spa",     label: "СПА і відновлення" },
];

export const REGIONS_LIST = [
  "Голосіївський",
  "Оболонський",
  "Печерський",
  "Подільський",
  "Святошинський",
  "Соломʼянський",
  "Шевченківський",
  "Дарницький",
  "Деснянський",
  "Дніпровський",
] as const;

export const AUDIENCE_LIST = [
  "Захисники і їх сімʼї",
  "Лише захисники",
  "Тільки захисниці (жінки)",
  "Тільки захисники (чоловіки)",
] as const;

export const RECURRENCE_LIST = ["Одноразова", "Регулярна"] as const;

export const PRICE_LIST = [
  "Безкоштовно для всіх",
  "Безкоштовно для ветеранів та родин",
  "Безкоштовно для УБД",
  "Через держпрограму",
  "Знижка для ветеранів",
  "Платно",
] as const;

export const COMFORT_LIST = [
  "Поруч укриття",
  "Без зйомки",
  "Адаптивний простір",
  "18+",
] as const;

export const COVER_TONES: readonly PhotoTone[] = [
  "cream",
  "sand",
  "sage",
  "green",
  "blue",
  "rose",
];

// ─── Steps ────────────────────────────────────────────

export interface FormStep {
  id: 1 | 2 | 3;
  label: string;
  hint: string;
}

export const STEPS: readonly FormStep[] = [
  { id: 1, label: "Основа",         hint: "Що, коли, де" },
  { id: 2, label: "Доступ і місця", hint: "Кому, скільки, по чім" },
  { id: 3, label: "Деталі",         hint: "Опис і комфорт" },
];

// ─── Draft shape ──────────────────────────────────────

export interface EventDraft {
  title: string;
  catId: FormCategoryId;
  /** ISO `YYYY-MM-DD` from <input type="date">. */
  date: string;
  /** `HH:MM` from <input type="time">. */
  time: string;
  duration: string;
  place: string;
  region: string;
  /** Optional lat/lng picked from the map. Both null until the user picks. */
  lat: number | null;
  lng: number | null;
  desc: string;
  cover: PhotoTone;
  /**
   * URL of an uploaded cover photo (returned from `/me/uploads/event-cover`).
   * When set, the preview and saved event use the photo instead of the
   * tone-only gradient. `null` until the user uploads.
   */
  coverUrl: string | null;
  capacity: string;
  quota: string;
  audience: string;
  recurrence: string;
  price: string;
  comfort: Set<string>;
}

export const DEFAULT_DRAFT: EventDraft = {
  title: "",
  catId: "culture",
  date: "",
  time: "",
  duration: "",
  place: "",
  region: "",
  lat: null,
  lng: null,
  desc: "",
  cover: "cream",
  coverUrl: null,
  capacity: "",
  quota: "",
  audience: "",
  recurrence: "",
  price: "Безкоштовно для всіх",
  comfort: new Set<string>(),
};

// ─── Derivations used by the live preview ────────────

const PIN_CATEGORY: Record<FormCategoryId, EventCategory> = {
  sport:   "sport",
  yoga:    "sport",
  culture: "culture",
  study:   "culture",
  nature:  "social",
  psy:     "social",
  social:  "social",
  rehab:   "social",
  spa:     "social",
};

export function previewCategory(catId: FormCategoryId): EventCategory {
  return PIN_CATEGORY[catId];
}

export function previewCategoryLabel(catId: FormCategoryId): string {
  return CATEGORIES_LIST.find((c) => c.id === catId)?.label ?? "";
}

/** Up to three readable badges synthesised from the draft. */
export function previewBadges(draft: EventDraft): string[] {
  const badges: string[] = [];
  if (draft.audience === "Лише захисники") badges.push("Для ветеранів");
  if (draft.audience.includes("жінки")) badges.push("Жінки-ветеранки");
  if (draft.comfort.has("Без зйомки")) badges.push("Без зйомки");
  if (draft.comfort.has("Адаптивний простір")) badges.push("Адаптивне");
  if (
    draft.price === "Безкоштовно для всіх" ||
    draft.price === "Безкоштовно для ветеранів та родин"
  ) {
    badges.push("Безкоштовно");
  }
  return badges.slice(0, 3);
}

export function previewCapacity(draft: EventDraft): number | null {
  const quota = parseInt(draft.quota, 10);
  const cap = parseInt(draft.capacity, 10);
  if (!Number.isNaN(quota) && quota > 0) return quota;
  if (!Number.isNaN(cap) && cap > 0) return cap;
  return null;
}

/**
 * Mocked attendee count for the preview — caps at 3 so the preview always
 * looks populated but not full. Real attendees come in after publishing.
 */
export function previewCount(draft: EventDraft): number {
  const cap = previewCapacity(draft);
  if (cap == null) return 0;
  return Math.min(3, cap);
}

/**
 * Format the draft's ISO date into the same short Ukrainian label the cards
 * show (e.g. "пт, 15 трав"). Empty input → empty string so the preview can
 * fall back to a placeholder.
 */
export function previewDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("uk-UA", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(/\.$/, "");
}
