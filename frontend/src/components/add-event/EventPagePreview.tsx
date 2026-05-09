"use client";

import { Photo } from "@/components/atoms/Photo";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { SeatBar } from "@/components/shared/SeatBar";
import { CalIcon, HeartIcon, PinIcon } from "@/components/icons";
import { peopleOf } from "@/data/people";
import {
  previewBadges,
  previewCapacity,
  previewCategory,
  previewCategoryLabel,
  previewCount,
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
const PREVIEW_NAMES = ["Тарас", "Микола"];

/**
 * Live preview of the organizer draft styled like the public event page.
 * Used as the right column on desktop and the slide-in overlay on mobile.
 */
export function EventPagePreview({ draft }: { draft: EventDraft }) {
  const cat = previewCategory(draft.catId);
  const catLabel = previewCategoryLabel(draft.catId);
  const badges = previewBadges(draft);
  const capacity = previewCapacity(draft);
  const count = previewCount(draft);

  const place = draft.place || "Місце події";
  const placeLine = draft.region ? `${place} · ${draft.region} район` : place;
  const date = draft.date || "Дата";
  const time = draft.time || "00:00";

  return (
    <div
      className="bg-bg h-full w-full overflow-auto"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <div className="relative">
        <Photo
          tone={draft.cover}
          height={280}
          radius={0}
          alt={`Обкладинка події «${draft.title || "Назва події"}»`}
          style={{ borderRadius: "0 0 20px 20px" }}
        />
        <div className="absolute inset-x-4.5 top-4.5 flex items-start justify-between">
          <Pill color={CATEGORY_PILL_COLOR[cat] ?? "grey"}>{catLabel}</Pill>
          <div
            aria-hidden
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl backdrop-blur-md shadow-soft"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            <HeartIcon size={18} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-7 pt-6 pb-8">
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b, i) => (
              <Pill key={`${b}-${i}`} color={BADGE_PILL_COLOR[b] ?? "grey"}>
                {b}
              </Pill>
            ))}
          </div>
        ) : null}

        <h1
          className="text-text m-0"
          style={{
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {draft.title || "Назва події"}
        </h1>

        <div
          className="text-text2 flex flex-col gap-2"
          style={{ fontSize: 15 }}
        >
          <span className="flex items-center gap-2.5">
            <CalIcon size={16} />
            {date} · {time}
          </span>
          <span className="flex items-center gap-2.5">
            <PinIcon size={16} />
            {placeLine}
          </span>
        </div>

        <CounterBlock
          count={count}
          people={PREVIEW_ATTENDEES}
          names={PREVIEW_NAMES}
        />

        {capacity ? <SeatBar taken={count} capacity={capacity} /> : null}

        <p
          className="text-text m-0 mt-2 whitespace-pre-wrap"
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            letterSpacing: "-0.005em",
          }}
        >
          {draft.desc ||
            "Опис події з’явиться тут, коли ви додасте його у формі ліворуч."}
        </p>
      </div>
    </div>
  );
}
