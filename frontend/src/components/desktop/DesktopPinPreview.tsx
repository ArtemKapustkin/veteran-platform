"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { SeatBar } from "@/components/shared/SeatBar";
import { ArrowIcon, CloseIcon, UserIcon } from "@/components/icons";
import { GroupRegisterSheet } from "@/components/sheets/GroupRegisterSheet";
import type { AppEvent } from "@/data/events";
import { useAuthGuard } from "@/lib/useAuthGuard";

export function DesktopPinPreview({ event }: { event: AppEvent }) {
  const router = useRouter();
  const params = useSearchParams();
  const requireAuth = useAuthGuard();
  const [groupOpen, setGroupOpen] = useState(false);

  // Mirrors the mobile `EventSheet`: a quick map-pin preview with two
  // CTAs — invite a buddy (accent) and jump to the full event page.
  // Direct RSVP / Telegram share still live on /events/[id] to keep
  // this surface lightweight.

  const openGroup = () => {
    if (!requireAuth({ hint: "Щоб запросити побратима" })) return;
    setGroupOpen(true);
  };

  const onClose = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("event");
    const search = next.toString();
    router.push(
      window.location.pathname + (search ? "?" + search : ""),
      { scroll: false },
    );
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

      <div className="flex flex-col gap-2">
        <Btn
          kind="invite"
          size="md"
          fullWidth
          icon={<UserIcon size={16} />}
          onClick={openGroup}
        >
          Запросити побратима
        </Btn>
        <Link
          href={`/events/${event.id}`}
          aria-label={`Перейти до події «${event.title}»`}
        >
          <Btn
            kind="secondary"
            size="md"
            fullWidth
            asLink
            iconRight={<ArrowIcon size={16} />}
          >
            Перейти до події
          </Btn>
        </Link>
      </div>

      {groupOpen ? (
        <GroupRegisterSheet event={event} onClose={() => setGroupOpen(false)} />
      ) : null}
    </aside>
  );
}
