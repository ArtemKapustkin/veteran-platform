import type {
  AccessibilityTag,
  ApiEventCategory,
  CostTier,
  EventFormat,
  EventRepeat,
  ForWhom,
  KyivDistrict,
} from "@/lib/api/types";
import type { EventDraft, FormCategoryId } from "@/components/add-event/draft";
import { DEFAULT_DRAFT } from "@/components/add-event/draft";

/** Maps API categories to the narrower previewtaxonomy in `draft.ts`. */
const API_CATEGORY_TO_PREVIEW: Record<ApiEventCategory, FormCategoryId> = {
  spa: "spa",
  sport: "sport",
  yoga: "yoga",
  culture: "culture",
  education: "study",
  nature: "nature",
  psychology: "psy",
  social: "social",
  rehabilitation: "rehab",
};

const DISTRICT_LABEL: Record<KyivDistrict, string> = {
  holosiivskyi: "Голосіївський",
  obolonskyi: "Оболонський",
  pecherskyi: "Печерський",
  podilskyi: "Подільський",
  sviatoshynskyi: "Святошинський",
  solomianskyi: "Соломʼянський",
  shevchenkivskyi: "Шевченківський",
  darnytskyi: "Дарницький",
  desnianskyi: "Деснянський",
  dniprovskyi: "Дніпровський",
};

/** Must match strings checked in `previewBadges()` in `draft.ts`. */
const AUDIENCE_BY_FOR_WHOM: Record<ForWhom, string> = {
  veterans: "Лише захисники",
  female_veterans: "Тільки захисниці (жінки)",
  male_veterans: "Тільки захисники (чоловіки)",
  families: "Захисники і їх сімʼї",
  children: "Захисники і їх сімʼї",
  fallen_families: "Захисники і їх сімʼї",
  active_military: "Лише захисники",
  veterans_and_families: "Захисники і їх сімʼї",
  open: "Захисники і їх сімʼї",
};

const PRICE_BY_TIER: Record<CostTier, string> = {
  free_for_all: "Безкоштовно для всіх",
  free_for_veterans_and_families: "Безкоштовно для ветеранів та родин",
  free_for_ubd: "Безкоштовно для УБД",
  free_via_state_program: "Через держпрограму",
  discount_for_veterans: "Знижка для ветеранів",
  paid: "Платно",
};

const COMFORT_BY_TAG: Partial<Record<AccessibilityTag, string>> = {
  is_accessible: "Адаптивний простір",
  no_shooting: "Без зйомки",
  shelter_nearby: "Поруч укриття",
  age_18_plus: "18+",
};

function parseCoord(s: string): number | null {
  const n = Number.parseFloat(s.trim());
  return Number.isFinite(n) ? n : null;
}

function derivePlace(opts: {
  format: EventFormat;
  venue: string;
  address: string;
  city: string;
}): string {
  if (opts.format === "online") return "Онлайн";
  const line = opts.venue.trim() || opts.address.trim() || opts.city.trim();
  return line;
}

export function adminFormToPreviewDraft(form: {
  title: string;
  description: string;
  category: ApiEventCategory;
  format: EventFormat;
  repeat: EventRepeat;
  forWhom: ForWhom;
  date: string;
  time: string;
  quota: string;
  costTier: CostTier;
  accessibility: Set<AccessibilityTag>;
  city: string;
  district: KyivDistrict | "";
  address: string;
  venue: string;
  lat: string;
  lng: string;
  coverImageUrl: string;
}): EventDraft {
  const comfort = new Set<string>();
  for (const tag of form.accessibility) {
    const c = COMFORT_BY_TAG[tag];
    if (c) comfort.add(c);
  }

  const recurrence = form.repeat === "once" ? "Одноразова" : "Регулярна";

  return {
    ...DEFAULT_DRAFT,
    title: form.title,
    desc: form.description,
    catId: API_CATEGORY_TO_PREVIEW[form.category],
    date: form.date,
    time: form.time,
    duration: "",
    place: derivePlace({
      format: form.format,
      venue: form.venue,
      address: form.address,
      city: form.city,
    }),
    region: form.district ? DISTRICT_LABEL[form.district] : "",
    lat: parseCoord(form.lat),
    lng: parseCoord(form.lng),
    coverUrl: form.coverImageUrl.trim() || null,
    quota: form.quota,
    capacity: "",
    audience: AUDIENCE_BY_FOR_WHOM[form.forWhom],
    recurrence,
    price: PRICE_BY_TIER[form.costTier],
    comfort,
  };
}
