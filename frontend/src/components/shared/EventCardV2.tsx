"use client";

import Link from "next/link";
import { Photo } from "@/components/atoms/Photo";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { SeatBar } from "@/components/shared/SeatBar";
import { HeartFillIcon, HeartIcon, PinIcon } from "@/components/icons";
import { CATEGORIES } from "@/data/categories";
import type { AppEvent } from "@/data/events";
import { useEventsStore } from "@/lib/store";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useMounted } from "@/lib/useMounted";

const BADGE_COLORS: Record<string, PillColor> = {
  "Для ветеранів": "sand",
  "Адаптивне": "green",
  "Без зйомки": "grey",
  "Малий формат": "blue",
  "Безкоштовно": "amber",
  "Безкоштовно для своїх": "amber",
  "Безкоштовно для УБД": "amber",
  "Через держпрограму": "amber",
  "Знижка для ветеранів": "amber",
  "Платно": "rose",
  "Жінки-ветеранки": "rose",
  "Тільки УБД": "sand",
  "Можна з дітьми": "green",
  "Поруч укриття": "grey",
  "18+": "rose",
  "Мікс": "grey",
};

// Map the 9 API categories onto the 3-color pin palette already in the
// design (green/blue/amber). Anything we don't know about falls through
// to a neutral grey pill.
const CAT_PILL_COLOR: Record<string, PillColor> = {
  sport: "green",
  yoga: "green",
  rehabilitation: "green",
  culture: "blue",
  education: "blue",
  spa: "blue",
  social: "amber",
  psychology: "amber",
  nature: "amber",
};

/**
 * Vertical event card used in the mobile list and the desktop grid.
 *
 * Structure:
 *   <article>
 *     <Link>     full-card hit area (linked to /events/[id] by default)
 *     <button>   save heart, sibling so we don't nest buttons
 *
 * `active` highlights the card with a sage-green ring (used to mirror the
 * focused pin on desktop split view). `onSelect` overrides the default
 * navigation; on desktop the parent passes a handler that updates `?event=`
 * instead of navigating to the detail page.
 */
export function EventCardV2({
  event,
  active = false,
  onSelect,
}: {
  event: AppEvent;
  active?: boolean;
  onSelect?: () => void;
}) {
  const meta = CATEGORIES[event.category];
  const mounted = useMounted();
  const toggleSaved = useEventsStore((s) => s.toggleSaved);
  const isSavedReal = useEventsStore((s) => s.savedIds.includes(event.id));
  const isSaved = mounted && isSavedReal;
  const requireAuth = useAuthGuard();

  const handleLinkClick = (e: React.MouseEvent) => {
    if (!onSelect) return;
    e.preventDefault();
    onSelect();
  };

  const handleSave = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!requireAuth({ hint: "Щоб зберегти подію" })) return;
    toggleSaved(event.id);
  };

  return (
    <article
      className="bg-surface relative flex w-full shrink-0 flex-col overflow-hidden rounded-2xl transition-all duration-150"
      style={{
        border: active
          ? "2px solid var(--color-primary)"
          : "1px solid var(--color-border-soft)",
        boxShadow: active
          ? "0 8px 24px rgba(91,140,94,0.18)"
          : "var(--shadow-soft)",
      }}
    >
      <Link
        href={`/events/${event.id}`}
        onClick={handleLinkClick}
        aria-label={`${event.title}, ${event.date} ${event.time}, ${event.place}`}
        className="flex flex-col text-left"
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "4 / 3" }}
        >
          <Photo
            tone={event.coverTone}
            fill
            radius={0}
            alt={`Обкладинка події «${event.title}»`}
          />
          <div className="absolute left-2.5 top-2.5 right-[54px] flex flex-wrap gap-1.5">
            <Pill color={CAT_PILL_COLOR[event.category] ?? "grey"}>
              {meta.label}
            </Pill>
            {event.badges.slice(0, 2).map((b, i) => (
              <Pill key={`${b}-${i}`} color={BADGE_COLORS[b] ?? "grey"}>
                {b}
              </Pill>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 pt-3.5 pb-4">
          <div className="flex flex-col gap-1.5">
            <div
              className="text-text2"
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {event.date} · {event.time}
            </div>
            <div
              className="text-text overflow-hidden"
              style={{
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1.22,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {event.title}
            </div>
            <div
              className="text-text2 flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
              style={{ fontSize: 13 }}
            >
              <PinIcon size={13} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {event.distance ? `${event.place} · ${event.distance}` : event.place}
              </span>
            </div>
          </div>

          <CounterBlock
            count={event.count}
            people={event.attendees}
            beFirst={event.beFirst}
            compact
          />

          {event.capacity ? (
            <SeatBar taken={event.count} capacity={event.capacity} compact />
          ) : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleSave}
        aria-label={isSaved ? "Видалити зі збережених" : "Зберегти подію"}
        aria-pressed={isSaved}
        className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.92)",
          color: isSaved ? "#C04848" : "var(--color-text2)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >
        {isSaved ? <HeartFillIcon size={17} /> : <HeartIcon size={17} />}
      </button>
    </article>
  );
}
