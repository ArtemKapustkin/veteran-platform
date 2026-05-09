"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { SeatBar } from "@/components/shared/SeatBar";
import { CheckIcon, CloseIcon, TgIcon } from "@/components/icons";
import type { AppEvent } from "@/data/events";
import { telegramShareUrl } from "@/lib/share";
import { useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export function DesktopPinPreview({ event }: { event: AppEvent }) {
  const router = useRouter();
  const params = useSearchParams();
  const mounted = useMounted();
  const setRsvp = useEventsStore((s) => s.setRsvp);
  const isRsvpReal = useEventsStore((s) => s.rsvpIds.includes(event.id));
  const isRsvp = mounted && isRsvpReal;

  const onClose = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("event");
    const search = next.toString();
    router.push(
      window.location.pathname + (search ? "?" + search : ""),
      { scroll: false },
    );
  };

  const onShare = () => {
    window.open(
      telegramShareUrl(event),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const onRsvp = async () => {
    try {
      await setRsvp(event.id, true);
    } catch (e) {
      window.alert(`Не вдалось оформити запис: ${(e as Error).message}`);
    }
  };

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="pin-preview-title"
      className="bg-surface absolute bottom-6 left-6 flex flex-col gap-3 rounded-[18px] p-5"
      style={{
        maxWidth: 440,
        width: "calc(100% - 48px)",
        boxShadow: "0 16px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3
          id="pin-preview-title"
          className="text-text m-0"
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          {event.title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="text-text2 flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-lg bg-[#F2F1ED]"
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <div
        className="text-text2 flex flex-wrap"
        style={{ rowGap: 4, columnGap: 12, fontSize: 13 }}
      >
        <span>
          {event.date} · {event.time}
        </span>
        {event.place ? <span>· {event.place}</span> : null}
      </div>
      <CounterBlock
        count={event.count}
        people={event.attendees}
        names={event.attendeeNames}
        beFirst={event.beFirst}
        compact
      />
      {event.capacity ? (
        <SeatBar taken={event.count} capacity={event.capacity} compact />
      ) : null}

      <div>
        <Btn
          kind="invite"
          size="lg"
          fullWidth
          icon={<TgIcon size={18} />}
          onClick={onShare}
        >
          Покликати побратима
        </Btn>
        <div
          className="text-text2 mt-1.5 text-center"
          style={{ fontSize: 11, letterSpacing: "-0.005em" }}
        >
          через Telegram · одним тапом
        </div>
      </div>

      {isRsvp ? (
        <div
          className="flex items-center justify-center gap-1.5 py-1"
          style={{
            color: "#0E6E45",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckIcon size={15} stroke="#0E6E45" />
          Ти йдеш — побратими побачать
        </div>
      ) : (
        <div className="flex gap-2">
          <Btn
            kind="secondary"
            size="md"
            fullWidth
            onClick={onRsvp}
          >
            Я йду
          </Btn>
          <Link href={`/events/${event.id}`} className="flex-shrink-0">
            <Btn kind="ghost" size="md" asLink>
              Деталі
            </Btn>
          </Link>
        </div>
      )}
    </aside>
  );
}
