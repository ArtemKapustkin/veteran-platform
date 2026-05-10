"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Btn } from "@/components/atoms/Btn";
import { CalIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { useEvents } from "@/lib/useEvents";
import { useCityStore } from "@/lib/useCity";
import { useMounted } from "@/lib/useMounted";
import {
  applyClientFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  snapshotFilters,
  uiFiltersToApi,
  useFiltersStore,
  type DatePreset,
  type UiFilters,
} from "@/lib/useFilters";
import type {
  AccessibilityTag,
  ApiEventCategory,
  CostTier,
  ForWhom,
  KyivDistrict,
  ParticipantsBucket,
  EventRepeat,
} from "@/lib/api";

// ─── Option catalogues ────────────────────────────────────────
//
// Each chip group declares its UI label + the API enum it maps onto.
// Keeping the mapping co-located with the labels means we never have to
// hunt across files when the backend grows a new option (or renames one).

interface OptionRow<V extends string> {
  label: string;
  value: V;
}

const CATEGORY_OPTIONS: ReadonlyArray<OptionRow<ApiEventCategory>> = [
  { label: "Спорт",                  value: "sport" },
  { label: "Йога і медитація",       value: "yoga" },
  { label: "Культура",               value: "culture" },
  { label: "Навчання",               value: "education" },
  { label: "Природа і тури",         value: "nature" },
  { label: "Психологічна підтримка", value: "psychology" },
  { label: "Зустрічі і спілкування", value: "social" },
  { label: "Реабілітація",           value: "rehabilitation" },
  { label: "СПА і відновлення",      value: "spa" },
];

const DATE_OPTIONS: ReadonlyArray<OptionRow<DatePreset>> = [
  { label: "Сьогодні",     value: "today" },
  { label: "Завтра",       value: "tomorrow" },
  { label: "Цей тиждень",  value: "this_week" },
  { label: "Цей місяць",   value: "this_month" },
];

const DISTRICT_OPTIONS: ReadonlyArray<OptionRow<KyivDistrict>> = [
  { label: "Голосіївський",  value: "holosiivskyi" },
  { label: "Оболонський",    value: "obolonskyi" },
  { label: "Печерський",     value: "pecherskyi" },
  { label: "Подільський",    value: "podilskyi" },
  { label: "Святошинський",  value: "sviatoshynskyi" },
  { label: "Соломʼянський",  value: "solomianskyi" },
  { label: "Шевченківський", value: "shevchenkivskyi" },
  { label: "Дарницький",     value: "darnytskyi" },
  { label: "Деснянський",    value: "desnianskyi" },
  { label: "Дніпровський",   value: "dniprovskyi" },
];

const SIZE_OPTIONS: ReadonlyArray<OptionRow<ParticipantsBucket>> = [
  { label: "До 10",  value: "up_to_10" },
  { label: "10–30",  value: "10_to_30" },
  { label: "30+",    value: "30_plus" },
];

const AUDIENCE_OPTIONS: ReadonlyArray<OptionRow<ForWhom>> = [
  { label: "Захисники і їх сімʼї",       value: "veterans_and_families" },
  { label: "Лише захисники",             value: "veterans" },
  { label: "Тільки захисниці (жінки)",   value: "female_veterans" },
  { label: "Тільки захисники (чоловіки)", value: "male_veterans" },
];

const PRICE_OPTIONS: ReadonlyArray<OptionRow<CostTier>> = [
  { label: "Безкоштовно для всіх",            value: "free_for_all" },
  { label: "Безкоштовно для ветеранів та родин", value: "free_for_veterans_and_families" },
  { label: "Безкоштовно для УБД",             value: "free_for_ubd" },
  { label: "Через держпрограму",              value: "free_via_state_program" },
  { label: "Знижка для ветеранів",            value: "discount_for_veterans" },
  { label: "Платно",                          value: "paid" },
];

const COMFORT_OPTIONS: ReadonlyArray<OptionRow<AccessibilityTag>> = [
  { label: "Поруч укриття",            value: "shelter_nearby" },
  { label: "Без зйомки та публікацій", value: "no_shooting" },
  { label: "Адаптивний простір",       value: "is_accessible" },
  { label: "18+",                      value: "age_18_plus" },
];

// "Регулярна" maps to the special `isRegular` flag (client-side filter)
// — it isn't a real `EventRepeat` value because the backend can't express
// "anything but `once`" in a single literal. Keeping both options as
// `OptionRow<string>` lets us handle the toggle uniformly below.
const RECURRENCE_OPTIONS: ReadonlyArray<{ label: string; value: "once" | "regular" }> = [
  { label: "Одноразова", value: "once" },
  { label: "Регулярна",  value: "regular" },
];

// ─── Atoms ────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-text-muted"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  children,
  on,
  onClick,
  icon,
}: {
  children: ReactNode;
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2.5 transition-colors"
      style={{
        background: on ? "#1A1A1A" : "#fff",
        color: on ? "#fff" : "var(--color-text)",
        border: on ? "none" : "1px solid var(--color-border)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.005em",
      }}
    >
      {on ? <CheckIcon size={13} /> : null}
      {icon}
      {children}
    </button>
  );
}

// ─── Helpers (immutable array updates) ────────────────────────

function toggleArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value];
}

function selectOnly<T>(arr: T[], value: T): T[] {
  // Single-select chip groups still live in arrays so the API mapping
  // stays uniform (`for_whom[]` etc.). Toggle the same chip off → empty.
  return arr.length === 1 && arr[0] === value ? [] : [value];
}

function pluralise(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// ─── Component ────────────────────────────────────────────────

export function FiltersSheet({ onClose }: { onClose: () => void }) {
  const mounted = useMounted();
  const setFilters = useFiltersStore((s) => s.setFilters);
  // Start with EMPTY_FILTERS so SSR markup matches; sync the user's
  // currently-applied filters in once we're mounted on the client. This
  // avoids a hydration mismatch when the sheet is opened directly via
  // `?filters=1` and lets us still pre-populate the chips for the user.
  // Deferred via microtask to satisfy React 19's `set-state-in-effect`.
  const [draft, setDraft] = useState<UiFilters>(EMPTY_FILTERS);
  useEffect(() => {
    Promise.resolve().then(() => {
      setDraft(snapshotFilters());
    });
  }, []);

  const city = useCityStore((s) => s.name);
  // Mirror the production filter pipeline so the live count matches what
  // the underlying screens will show after Apply.
  const apiFilters = useMemo(
    () => (mounted ? { city, ...uiFiltersToApi(draft) } : undefined),
    [mounted, city, draft],
  );
  const { events, loading } = useEvents(apiFilters);
  const matchEvents = useMemo(
    () => applyClientFilters(events, draft),
    [events, draft],
  );

  const totalActive = countActiveFilters(draft);

  const reset = () => setDraft(EMPTY_FILTERS);
  const apply = () => {
    setFilters(draft);
    onClose();
  };

  const onPickCustomDate = () => {
    const next = window.prompt(
      "Вкажи дату або проміжок (наприклад «15.05» або «13–17.05»)",
      draft.customDate ?? "",
    );
    if (next == null) return;
    const trimmed = next.trim();
    setDraft((s) => ({
      ...s,
      customDate: trimmed || null,
      // Custom range supersedes the preset chips.
      datePreset: trimmed ? null : s.datePreset,
    }));
  };

  const ctaLabel = (() => {
    if (totalActive === 0) return "Показати всі події";
    if (loading) return "Шукаємо…";
    const n = matchEvents.length;
    if (n === 0) return "Немає подій за фільтрами";
    return `Показати ${n} ${pluralise(n, "подію", "події", "подій")}`;
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-title"
      className="bg-bg absolute inset-0 z-50 flex flex-col overflow-auto"
    >
      <div className="bg-bg sticky top-0 z-10 flex items-center justify-between px-4.5 pt-3.5 pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити фільтри"
          className="bg-surface flex h-[38px] w-[38px] items-center justify-center rounded-xl shadow-soft"
        >
          <CloseIcon size={18} />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={totalActive === 0}
          className="rounded-lg px-3 py-2 disabled:cursor-default"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color:
              totalActive > 0
                ? "var(--color-text)"
                : "var(--color-text-muted)",
          }}
        >
          {totalActive > 0 ? `Скинути (${totalActive})` : "Скинути"}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-7 px-5.5 pt-2 pb-28">
        <h1
          id="filters-title"
          className="text-text mt-1 mb-0"
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          Фільтри
        </h1>

        <Section title="Категорія події">
          {CATEGORY_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.categories.includes(opt.value)}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  categories: toggleArray(s.categories, opt.value),
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>

        <Section title="Дата">
          {DATE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.datePreset === opt.value}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  datePreset: s.datePreset === opt.value ? null : opt.value,
                  // Picking a preset clears any free-form override.
                  customDate: null,
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
          <Chip
            on={Boolean(draft.customDate)}
            onClick={onPickCustomDate}
            icon={<CalIcon size={13} />}
          >
            {draft.customDate ?? "Вибрати дату"}
          </Chip>
        </Section>

        <Section title="Район Києва">
          {DISTRICT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.districts.includes(opt.value)}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  districts: toggleArray(s.districts, opt.value),
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>

        <Section title="Кількість учасників">
          {SIZE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.participants === opt.value}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  participants:
                    s.participants === opt.value ? null : opt.value,
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>

        <Section title="Для кого">
          {AUDIENCE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.forWhom.includes(opt.value)}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  forWhom: selectOnly(s.forWhom, opt.value),
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>

        <Section title="Регулярність">
          {RECURRENCE_OPTIONS.map((opt) => {
            const on =
              opt.value === "once"
                ? draft.repeat === "once" && !draft.isRegular
                : draft.isRegular;
            return (
              <Chip
                key={opt.value}
                on={on}
                onClick={() => {
                  if (opt.value === "once") {
                    setDraft((s) => ({
                      ...s,
                      repeat: s.repeat === "once" ? null : ("once" as EventRepeat),
                      isRegular: false,
                    }));
                  } else {
                    setDraft((s) => ({
                      ...s,
                      isRegular: !s.isRegular,
                      repeat: null,
                    }));
                  }
                }}
              >
                {opt.label}
              </Chip>
            );
          })}
        </Section>

        <Section title="Вартість">
          {PRICE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.costTiers.includes(opt.value)}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  costTiers: toggleArray(s.costTiers, opt.value),
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>

        <Section title="Безпека і комфорт">
          {COMFORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              on={draft.accessibility.includes(opt.value)}
              onClick={() =>
                setDraft((s) => ({
                  ...s,
                  accessibility: toggleArray(s.accessibility, opt.value),
                }))
              }
            >
              {opt.label}
            </Chip>
          ))}
        </Section>
      </div>

      <div
        className="sticky bottom-0 z-10 px-4.5 pt-3.5 pb-6.5 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.04)",
        }}
      >
        <Btn
          kind="primary"
          size="lg"
          fullWidth
          onClick={apply}
          disabled={totalActive > 0 && !loading && matchEvents.length === 0}
        >
          {ctaLabel}
        </Btn>
      </div>
    </div>
  );
}
