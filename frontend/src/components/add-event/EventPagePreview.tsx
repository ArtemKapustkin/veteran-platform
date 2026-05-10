"use client";

import { Photo } from "@/components/atoms/Photo";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { SeatBar } from "@/components/shared/SeatBar";
import { HeartIcon, PinIcon } from "@/components/icons";
import { peopleOf } from "@/data/people";
import {
  previewBadges,
  previewCapacity,
  previewCategory,
  previewCategoryLabel,
  previewCount,
  previewDate,
  type EventDraft,
} from "./draft";

const CATEGORY_PILL_COLOR: Record<string, PillColor> = {
  sport: "green",
  culture: "blue",
  social: "amber",
};

const BADGE_PILL_COLOR: Record<string, PillColor> = {
  "Для ветеранів": "sand",
  "Адаптивне": "green",
  "Без зйомки": "grey",
  "Безкоштовно": "amber",
  "Жінки-ветеранки": "rose",
};

// Same fixed roster as the prototype's draftToEvent — gives the preview
// some life without inventing new people.
const PREVIEW_ATTENDEES = peopleOf("taras", "mykola", "serhiy");

/**
 * Live preview of the organizer draft, rendered as the same vertical event
 * card the public list/grid uses (`EventCardV2`). We mirror its styling
 * here instead of importing it directly so the preview stays a pure
 * presentational component — no auth guard, no save toggle, no link.
 *
 * The card is sized for a list cell (~320px wide) and the wrapper centers
 * it inside whatever block hosts it (desktop right column, mobile sheet).
 */
export function EventPagePreview({ draft }: { draft: EventDraft }) {
  const cat = previewCategory(draft.catId);
  const catLabel = previewCategoryLabel(draft.catId);
  const badges = previewBadges(draft);
  const capacity = previewCapacity(draft);
  const count = previewCount(draft);

  const place = draft.place || "Місце події";
  const placeLine = draft.region ? `${place} · ${draft.region} район` : place;
  const date = previewDate(draft.date) || "Дата";
  const time = draft.time || "00:00";

  return (
    <div
      className="flex h-full w-full items-center justify-center px-6 py-8"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <article
        className="bg-surface relative flex w-full shrink-0 flex-col overflow-hidden rounded-2xl"
        style={{
          maxWidth: 320,
          border: "1px solid var(--color-border-soft)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "4 / 3" }}
        >
          <Photo
            tone={draft.cover}
            fill
            radius={0}
            imageUrl={draft.coverUrl}
            alt={`Обкладинка події «${draft.title || "Назва події"}»`}
          />
          <div className="absolute left-2.5 top-2.5 right-[54px] flex flex-wrap gap-1.5">
            <Pill color={CATEGORY_PILL_COLOR[cat] ?? "grey"}>{catLabel}</Pill>
            {badges.slice(0, 2).map((b, i) => (
              <Pill key={`${b}-${i}`} color={BADGE_PILL_COLOR[b] ?? "grey"}>
                {b}
              </Pill>
            ))}
          </div>
          {/* Heart is decorative in the preview — matches card layout but
              doesn't toggle anything. */}
          <div
            aria-hidden
            className="absolute right-2.5 top-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "var(--color-text2)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <HeartIcon size={17} />
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
              {date} · {time}
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
              {draft.title || "Назва події"}
            </div>
            <div
              className="text-text2 flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
              style={{ fontSize: 13 }}
            >
              <PinIcon size={13} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {placeLine}
              </span>
            </div>
          </div>

          <CounterBlock count={count} people={PREVIEW_ATTENDEES} compact />

          {capacity ? (
            <SeatBar taken={count} capacity={capacity} compact />
          ) : null}
        </div>
      </article>
    </div>
  );
}
