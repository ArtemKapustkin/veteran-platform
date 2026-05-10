"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { Btn } from "@/components/atoms/Btn";
import { Photo } from "@/components/atoms/Photo";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { EventBadges } from "@/components/shared/EventBadges";
import { SeatBar } from "@/components/shared/SeatBar";
import { CancelRsvpAction } from "@/components/shared/CancelRsvpAction";
import { MapCanvas } from "@/components/map/MapCanvas";
import { EventPin } from "@/components/map/EventPin";
import {
  BackIcon,
  CalIcon,
  CheckIcon,
  HeartFillIcon,
  HeartIcon,
  PinIcon,
  UserIcon,
} from "@/components/icons";
import { GroupRegisterSheet } from "@/components/sheets/GroupRegisterSheet";
import { InvitationBanner } from "@/components/shared/InvitationBanner";
import { CATEGORIES } from "@/data/categories";
import type { AppEvent } from "@/data/events";
import { useEventsStore } from "@/lib/store";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useMounted } from "@/lib/useMounted";
import { toast } from "@/lib/useToast";

export function EventDetailScreen({ event }: { event: AppEvent }) {
  const mounted = useMounted();
  const setRsvp = useEventsStore((s) => s.setRsvp);
  const toggleSaved = useEventsStore((s) => s.toggleSaved);
  const isRsvpReal = useEventsStore((s) => s.rsvpIds.includes(event.id));
  const isSavedReal = useEventsStore((s) => s.savedIds.includes(event.id));
  const isRsvp = mounted && isRsvpReal;
  const isSaved = mounted && isSavedReal;
  const [rsvpPending, setRsvpPending] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const requireAuth = useAuthGuard();

  const openGroup = () => {
    if (!requireAuth({ hint: "Щоб запросити побратима" })) return;
    setGroupOpen(true);
  };

  // Measure the floating bottom bar so the scrollable content below the
  // map reserves matching space — otherwise the (now multi-row) RSVP'd
  // confirmation card would overlap the map / description. Tracked via
  // ResizeObserver so the layout stays correct when the cancel control
  // expands inline.
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(112);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBarH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleRsvp = async (on: boolean) => {
    if (rsvpPending) return;
    if (!requireAuth({ hint: on ? "Щоб записатись на подію" : undefined })) return;
    setRsvpPending(true);
    try {
      await setRsvp(event.id, on);
      // Light haptic — no-op on desktop / iOS Safari, succeeds on Chrome
      // Android. Wrapped in try/catch in case the user has disabled it.
      try {
        navigator.vibrate?.(on ? 18 : 8);
      } catch {
        /* no-op */
      }
      if (on) {
        // Pre-tap count is `event.count`; once we register we'll be the
        // (count + 1)-th attendee. Backend recount catches up on next
        // refresh, but this read keeps the toast honest in the meantime.
        const others = Math.max(0, event.count);
        toast.success(
          "Записали тебе!",
          others > 0 ? `Разом із ${others} ${plur(others)}.` : undefined,
        );
      } else {
        toast.info("Запис скасовано");
      }
    } catch (e) {
      toast.error(
        on ? "Не вдалось записатися" : "Не вдалось скасувати запис",
        (e as Error).message,
      );
    } finally {
      setRsvpPending(false);
    }
  };

  const meta = CATEGORIES[event.category];

  return (
    <main
      className="bg-bg relative flex flex-col"
      style={{ minHeight: "100dvh" }}
    >
      <div className="relative">
        <Photo
          tone={event.coverTone}
          height={240}
          radius={0}
          label="EVENT · COVER 16:9"
          alt={`Обкладинка події «${event.title}»`}
          style={{ borderRadius: "0 0 20px 20px" }}
        />
        <Link
          href="/map"
          aria-label="Назад на карту"
          className="absolute left-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-xl backdrop-blur-md shadow-soft"
          style={{
            top: 54,
            background: "rgba(255,255,255,0.92)",
          }}
        >
          <BackIcon size={20} />
        </Link>
        <div className="absolute right-3.5 flex gap-2" style={{ top: 54 }}>
          <button
            type="button"
            onClick={() => {
              if (!requireAuth({ hint: "Щоб зберегти подію" })) return;
              toggleSaved(event.id);
            }}
            aria-label={isSaved ? "Видалити зі збережених" : "Зберегти подію"}
            aria-pressed={isSaved}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl backdrop-blur-md shadow-soft"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: isSaved ? "#C04848" : "var(--color-text)",
            }}
          >
            {isSaved ? <HeartFillIcon size={20} /> : <HeartIcon size={20} />}
          </button>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-4 px-5.5 pt-5"
        style={{ paddingBottom: barH + 24 }}
      >
        <EventBadges badges={event.badges} />
        <h1
          className="text-text m-0"
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {event.title}
        </h1>
        <div
          className="text-text2 flex flex-col gap-1.5"
          style={{ fontSize: 14 }}
        >
          <span className="flex items-center gap-2">
            <CalIcon size={14} />
            {event.date} · {event.time}
          </span>
          <span className="flex items-center gap-2">
            <PinIcon size={14} />
            {event.place} · {event.distance}
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

        <p
          className="text-text m-0"
          style={{
            fontSize: 15,
            lineHeight: 1.65,
            letterSpacing: "-0.005em",
          }}
        >
          {event.description}
        </p>

        <div
          className="border-border-soft relative h-[130px] w-full overflow-hidden rounded-2xl border"
          aria-label="Місце події на карті"
        >
          <MapCanvas
            longitude={event.location.lng}
            latitude={event.location.lat}
            zoom={14}
            interactive={false}
          >
            <Marker
              longitude={event.location.lng}
              latitude={event.location.lat}
              anchor="bottom"
            >
              <EventPin
                color={meta.pinColor}
                count={event.count}
                empty={event.beFirst}
                big
              />
            </Marker>
          </MapCanvas>
        </div>
      </div>

      <div
        ref={barRef}
        className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4.5 pt-3.5 pb-6.5 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.04)",
        }}
      >
        <InvitationBanner eventId={event.id} />
        {isRsvp ? (
          <>
            <div
              className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5"
              style={{
                background: "#E8F6EF",
                border: "1px solid #BFE7CF",
                animation: "var(--animate-pop-down)",
              }}
            >
              <span
                aria-hidden
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: "#0E6E45", color: "#fff" }}
              >
                <CheckIcon size={16} stroke="#fff" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span
                  style={{
                    color: "#0E6E45",
                    fontSize: 14.5,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Ти йдеш
                </span>
                {event.count > 0 ? (
                  <span
                    className="text-text2"
                    style={{ fontSize: 12.5 }}
                  >
                    Разом із {event.count} {plur(event.count)}.
                  </span>
                ) : null}
              </div>
            </div>
            <CancelRsvpAction onConfirm={() => handleRsvp(false)} />
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Btn
              kind="primary"
              size="lg"
              fullWidth
              loading={rsvpPending}
              onClick={() => handleRsvp(true)}
            >
              Я йду
            </Btn>
            <Btn
              kind="secondary"
              size="lg"
              fullWidth
              icon={<UserIcon size={18} />}
              onClick={openGroup}
            >
              Записатись з побратимом
            </Btn>
          </div>
        )}
      </div>

      {groupOpen ? (
        <GroupRegisterSheet event={event} onClose={() => setGroupOpen(false)} />
      ) : null}
    </main>
  );
}

/** Russian-rule pluraliser for "ветеран" — keeps the toast/banner copy
 *  natural ("1 своїм", "3 своїми", "8 своїми"). */
function plur(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "своїм";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "своїми";
  return "своїми";
}
