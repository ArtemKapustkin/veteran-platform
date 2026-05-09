"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { Photo } from "@/components/atoms/Photo";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { DragHandle } from "@/components/shared/DragHandle";
import { EventBadges } from "@/components/shared/EventBadges";
import { SeatBar } from "@/components/shared/SeatBar";
import {
  ArrowIcon,
  CalIcon,
  ClockIcon,
  PinIcon,
  TgIcon,
  WalkIcon,
} from "@/components/icons";
import { telegramShareUrl } from "@/lib/share";
import { useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import type { AppEvent } from "@/data/events";

export function EventSheet({
  event,
  onClose,
}: {
  event: AppEvent;
  onClose: () => void;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const setRsvp = useEventsStore((s) => s.setRsvp);
  const isRsvpReal = useEventsStore((s) => s.rsvpIds.includes(event.id));
  const isRsvp = mounted && isRsvpReal;

  const handleRsvp = () => {
    setRsvp(event.id, !isRsvp);
    if (!isRsvp) router.push(`/events/${event.id}`);
  };

  const handleShare = () => {
    window.open(
      telegramShareUrl(event),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-sheet-title"
      className="absolute inset-0 z-40"
    >
      {/* backdrop — top portion closes the sheet */}
      <button
        type="button"
        aria-label="Закрити"
        onClick={onClose}
        className="absolute inset-x-0 top-0 h-[42%] w-full cursor-default bg-transparent"
      />

      <div
        className="bg-surface absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl"
        style={{ height: "58%", boxShadow: "var(--shadow-sheet)" }}
      >
        <DragHandle />
        <div className="flex flex-1 flex-col gap-3.5 overflow-auto px-5 pt-3.5 pb-5.5">
          <Photo
            tone={event.coverTone}
            height={140}
            radius={14}
            label="EVENT · COVER"
            alt={`Обкладинка події «${event.title}»`}
          />
          <EventBadges badges={event.badges} />
          <h2
            id="event-sheet-title"
            className="text-text m-0"
            style={{
              fontSize: 21,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
            }}
          >
            {event.title}
          </h2>
          <div
            className="text-text2 flex flex-wrap"
            style={{ rowGap: 4, columnGap: 12, fontSize: 13 }}
          >
            <span className="flex items-center gap-1.5">
              <CalIcon size={13} />
              {event.date}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon size={13} />
              {event.time}
            </span>
            <span className="flex items-center gap-1.5">
              <PinIcon size={13} />
              {event.place}
            </span>
            <span className="flex items-center gap-1.5">
              <WalkIcon size={13} />
              {event.distance}
            </span>
          </div>
          <CounterBlock
            count={event.count}
            people={event.attendees}
            names={event.attendeeNames}
            beFirst={event.beFirst}
          />
          {event.capacity ? (
            <SeatBar taken={event.count} capacity={event.capacity} />
          ) : null}
          <div className="flex flex-col gap-2">
            <Btn
              kind="invite"
              size="lg"
              onClick={handleShare}
              icon={<TgIcon size={17} />}
              fullWidth
            >
              Покликати побратима
            </Btn>
            <div className="flex gap-2">
              <Btn
                kind={isRsvp ? "success" : "secondary"}
                size="md"
                onClick={handleRsvp}
                fullWidth
                className="flex-1"
              >
                {isRsvp ? "Ти йдеш" : "Я йду"}
              </Btn>
              <Link
                href={`/events/${event.id}`}
                aria-label="Деталі події"
              >
                <Btn
                  kind="ghost"
                  size="md"
                  asLink
                  className="gap-1.5 px-3"
                  iconRight={<ArrowIcon size={18} />}
                >
                  Деталі
                </Btn>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
