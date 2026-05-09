// Convert backend response shapes into the slimmer, presentation-friendly
// view models used by the React components. Anything that requires a
// formatted string, derived badge, or fallback value goes here so the UI
// layer stays free of branching on enum values.

import type { AppEvent } from "@/data/events";
import { KYIV_CENTER } from "@/data/events";
import type { EventCategory } from "@/data/categories";
import type { PhotoTone } from "@/components/atoms/Photo";
import type { AvatarTone } from "@/components/atoms/Avatar";
import type { Person } from "@/data/people";
import type {
  AccessibilityTag,
  ApiEvent,
  ApiEventAttendee,
  ApiEventCategory,
  AudienceStatus,
  CostTier,
  ForWhom,
} from "./types";

const CATEGORY_TO_TONE: Record<ApiEventCategory, PhotoTone> = {
  spa:            "blue",
  sport:          "sage",
  yoga:           "green",
  culture:        "cream",
  education:      "sand",
  nature:         "sand",
  psychology:     "rose",
  social:         "cream",
  rehabilitation: "green",
};

// Approximate city centroids for events whose backend record didn't
// supply lat/lng. Map still renders with a sensible default instead of
// dropping the pin into the Atlantic.
const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  Київ:      { lat: 50.4501, lng: 30.5234 },
  Львів:     { lat: 49.8397, lng: 24.0297 },
  Харків:    { lat: 49.9935, lng: 36.2304 },
  Дніпро:    { lat: 48.4647, lng: 35.0462 },
  Одеса:     { lat: 46.4825, lng: 30.7233 },
  Запоріжжя: { lat: 47.8388, lng: 35.1396 },
  Вінниця:   { lat: 49.2331, lng: 28.4682 },
};

const FOR_WHOM_BADGE: Partial<Record<ForWhom, string>> = {
  veterans:             "Для ветеранів",
  female_veterans:      "Жінки-ветеранки",
  male_veterans:        "Лише чоловіки",
  families:             "Для родин",
  children:             "Для дітей",
  fallen_families:      "Родини загиблих",
  active_military:      "Діючі військові",
  veterans_and_families:"Ветерани і родини",
  open:                 "Відкритий захід",
};

const COST_BADGE: Record<CostTier, string> = {
  free_for_all:                  "Безкоштовно",
  free_for_veterans_and_families:"Безкоштовно для своїх",
  free_for_ubd:                  "Безкоштовно для УБД",
  free_via_state_program:        "Через держпрограму",
  discount_for_veterans:         "Знижка для ветеранів",
  paid:                          "Платно",
};

const TAG_BADGE: Partial<Record<AccessibilityTag, string>> = {
  no_shooting:    "Без зйомки",
  is_accessible:  "Адаптивне",
  kids_allowed:   "Можна з дітьми",
  separate_zones: "Окремі зони",
  shelter_nearby: "Поруч укриття",
  age_18_plus:    "18+",
};

const DOW = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const MONTH_ABBR = [
  "січ", "лют", "бер", "квіт", "трав", "черв",
  "лип", "сер", "вер", "жовт", "лист", "груд",
] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildPlace(loc: ApiEvent["location"]): string {
  if (!loc) return "Онлайн";
  const parts: string[] = [];
  if (loc.venue) parts.push(loc.venue);
  if (loc.address) parts.push(loc.address);
  if (loc.city && parts.length === 0) parts.push(loc.city);
  if (loc.city && parts.length > 0 && !parts.join(", ").includes(loc.city)) {
    parts.push(loc.city);
  }
  return parts.join(", ") || "Локація уточнюється";
}

function buildBadges(ev: ApiEvent): string[] {
  const badges: string[] = [];

  const forWhomLabel = FOR_WHOM_BADGE[ev.for_whom];
  if (forWhomLabel) badges.push(forWhomLabel);

  if (ev.cost?.tier) badges.push(COST_BADGE[ev.cost.tier]);

  if (ev.verified_only) badges.push("Тільки УБД");

  for (const tag of ev.accessibility_tags ?? []) {
    const label = TAG_BADGE[tag];
    if (label) badges.push(label);
  }

  // Cap to 3 visible badges to match the original card layout.
  return badges.slice(0, 3);
}

function buildLocation(ev: ApiEvent): { lat: number; lng: number } {
  if (ev.location?.lat != null && ev.location?.lng != null) {
    return { lat: ev.location.lat, lng: ev.location.lng };
  }
  if (ev.location?.city && CITY_CENTERS[ev.location.city]) {
    return CITY_CENTERS[ev.location.city];
  }
  return KYIV_CENTER;
}

function categoryFor(api: ApiEventCategory): EventCategory {
  // 1:1 — `EventCategory` is just `ApiEventCategory` in this codebase now.
  return api;
}

// Avatar tone palette in display order. We hash the initial char's code
// point modulo the palette length so the same person always gets the same
// colour, but two consecutive avatars rarely collide.
const TONE_ORDER: AvatarTone[] = [
  "sand",
  "green",
  "blue",
  "rose",
  "cream",
  "sage",
];

// Female-coded audience statuses get the rose palette nudge so the UI can
// hint "this is a female veteran" without ever showing the audience flag
// explicitly. Family/fallen-family lean cream.
const TONE_BY_AUDIENCE: Partial<Record<AudienceStatus, AvatarTone>> = {
  veteran_female: "rose",
  family: "cream",
  fallen_family: "cream",
  active_military: "sage",
};

function pickTone(initial: string, audience?: AudienceStatus): AvatarTone {
  if (audience && TONE_BY_AUDIENCE[audience]) return TONE_BY_AUDIENCE[audience]!;
  if (!initial) return "sand";
  const code = initial.codePointAt(0) ?? 0;
  return TONE_ORDER[code % TONE_ORDER.length];
}

function attendeeToPerson(a: ApiEventAttendee): Person {
  const initial = (a.initial || "С").charAt(0).toUpperCase();
  return {
    initial,
    tone: pickTone(initial, a.audience_status),
    name: a.first_name || initial,
  };
}

export function apiEventToAppEvent(ev: ApiEvent): AppEvent {
  const seats = ev.seats_taken ?? 0;
  const attendees = (ev.attendees ?? []).map(attendeeToPerson);
  // The UI shows the first 1-2 names inline ("Іван, Микола та інші").
  // Drop entries where the only thing we know is the initial — a single
  // capital letter as a "name" would clutter the line without adding info.
  const attendeeNames = attendees
    .map((p) => p.name)
    .filter((n) => n.length > 1)
    .slice(0, 2);
  return {
    id: ev.id,
    category: categoryFor(ev.category),
    coverTone: CATEGORY_TO_TONE[ev.category] ?? "cream",
    title: ev.title,
    place: buildPlace(ev.location),
    date: formatDate(ev.starts_at),
    time: formatTime(ev.starts_at),
    distance: "",
    badges: buildBadges(ev),
    count: seats,
    capacity: ev.quota,
    attendees,
    attendeeNames,
    description: ev.description ?? "",
    location: buildLocation(ev),
    beFirst: seats === 0,
  };
}

