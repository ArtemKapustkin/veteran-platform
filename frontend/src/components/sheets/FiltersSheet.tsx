"use client";

import { useState, type ReactNode } from "react";
import { Btn } from "@/components/atoms/Btn";
import { CalIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { useEvents } from "@/lib/useEvents";

// ─── Filter schema ────────────────────────────────────────────
//
// Each section is either `multi: true` (chips toggle independently into a
// Set) or `multi: false` (chips behave like a radio group, value can be
// nullable). The Дата section additionally exposes a `Вибрати дату` chip
// that prompts for a custom range.

type SingleKey = "date" | "size" | "audience" | "recurrence";
type MultiKey = "category" | "region" | "price" | "comfort";

type FilterSection =
  | {
      key: MultiKey;
      title: string;
      multi: true;
      options: readonly string[];
    }
  | {
      key: SingleKey;
      title: string;
      multi: false;
      options: readonly string[];
      extra?: { label: string };
    };

const SECTIONS: readonly FilterSection[] = [
  {
    key: "category",
    title: "Категорія події",
    multi: true,
    options: [
      "Спорт",
      "Йога і медитація",
      "Культура",
      "Навчання",
      "Природа і тури",
      "Психологічна підтримка",
      "Зустрічі і спілкування",
      "Реабілітація",
      "СПА і відновлення",
    ],
  },
  {
    key: "date",
    title: "Дата",
    multi: false,
    options: ["Сьогодні", "Завтра", "Цей тиждень", "Цей місяць"],
    extra: { label: "Вибрати дату" },
  },
  {
    key: "region",
    title: "Район Києва",
    multi: true,
    options: [
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
    ],
  },
  {
    key: "size",
    title: "Кількість учасників",
    multi: false,
    options: ["До 10", "10–30", "30+"],
  },
  {
    key: "audience",
    title: "Для кого",
    multi: false,
    options: [
      "Захисники і їх сімʼї",
      "Лише захисники",
      "Тільки захисниці (жінки)",
      "Тільки захисники (чоловіки)",
    ],
  },
  {
    key: "recurrence",
    title: "Регулярність",
    multi: false,
    options: ["Одноразова", "Регулярна"],
  },
  {
    key: "price",
    title: "Вартість",
    multi: true,
    options: [
      "Безкоштовно для всіх",
      "Безкоштовно для ветеранів та родин",
      "Безкоштовно для УБД",
      "Через держпрограму",
      "Знижка для ветеранів",
      "Платно",
    ],
  },
  {
    key: "comfort",
    title: "Безпека і комфорт",
    multi: true,
    options: [
      "Поруч укриття",
      "Без зйомки та публікацій",
      "Адаптивний простір",
      "18+",
    ],
  },
];

interface FiltersState {
  category: Set<string>;
  date: string | null;
  region: Set<string>;
  size: string | null;
  audience: string | null;
  recurrence: string | null;
  price: Set<string>;
  comfort: Set<string>;
  customDate: string | null;
}

const INITIAL_STATE: FiltersState = {
  category: new Set(["Спорт"]),
  date: "Цей тиждень",
  region: new Set(),
  size: null,
  audience: "Захисники і їх сімʼї",
  recurrence: null,
  price: new Set(["Безкоштовно для всіх"]),
  comfort: new Set(["Без зйомки та публікацій"]),
  customDate: null,
};

const EMPTY_STATE: FiltersState = {
  category: new Set(),
  date: null,
  region: new Set(),
  size: null,
  audience: null,
  recurrence: null,
  price: new Set(),
  comfort: new Set(),
  customDate: null,
};

// Match-count copy (1 / 2-4 / 5+). The actual count is sourced from the
// live events list once the API responds; we only use this as a tiny
// pluralisation helper.
function matchPlural(n: number): string {
  if (n === 1) return "подію";
  if (n < 5) return "події";
  return "подій";
}

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

export function FiltersSheet({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<FiltersState>(INITIAL_STATE);
  const { events } = useEvents();

  const reset = () => setState(EMPTY_STATE);

  const toggleMulti = (key: MultiKey, val: string) => {
    setState((s) => {
      const next = new Set(s[key]);
      if (next.has(val)) next.delete(val);
      else next.add(val);
      return { ...s, [key]: next };
    });
  };

  const toggleSingle = (key: SingleKey, val: string) => {
    setState((s) => ({ ...s, [key]: s[key] === val ? null : val }));
  };

  const isOn = (
    section: FilterSection,
    val: string,
  ): boolean => {
    if (section.multi) return state[section.key].has(val);
    return state[section.key] === val;
  };

  const totalActive =
    state.category.size +
    (state.date ? 1 : 0) +
    state.region.size +
    (state.size ? 1 : 0) +
    (state.audience ? 1 : 0) +
    (state.recurrence ? 1 : 0) +
    state.price.size +
    state.comfort.size +
    (state.customDate ? 1 : 0);

  // Stub heuristic — every active filter shaves off a fraction of the
  // currently-loaded events, floor at 1 so the CTA never says "0 подій".
  // A future iteration will issue a `count`-only request that respects the
  // selected filters; for now we just react to the live events array.
  const matchCount = Math.max(
    1,
    events.length - Math.floor(totalActive / 1.5),
  );

  const onPickCustomDate = () => {
    const next = window.prompt(
      "Вкажи дату або проміжок (наприклад «15.05» або «13–17.05»)",
      state.customDate ?? "",
    );
    if (next == null) return;
    const trimmed = next.trim();
    setState((s) => ({
      ...s,
      customDate: trimmed || null,
      // Picking a custom range supersedes the preset chips.
      date: trimmed ? null : s.date,
    }));
  };

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

        {SECTIONS.map((sec) => (
          <Section key={sec.key} title={sec.title}>
            {sec.options.map((opt) => (
              <Chip
                key={opt}
                on={isOn(sec, opt)}
                onClick={
                  sec.multi
                    ? () => toggleMulti(sec.key, opt)
                    : () => toggleSingle(sec.key, opt)
                }
              >
                {opt}
              </Chip>
            ))}
            {!sec.multi && sec.extra ? (
              <Chip
                on={Boolean(state.customDate)}
                onClick={onPickCustomDate}
                icon={<CalIcon size={13} />}
              >
                {state.customDate ?? sec.extra.label}
              </Chip>
            ) : null}
          </Section>
        ))}
      </div>

      <div
        className="sticky bottom-0 z-10 px-4.5 pt-3.5 pb-6.5 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.04)",
        }}
      >
        <Btn kind="primary" size="lg" fullWidth onClick={onClose}>
          {totalActive === 0
            ? "Показати всі події"
            : `Показати ${matchCount} ${matchPlural(matchCount)}`}
        </Btn>
      </div>
    </div>
  );
}
