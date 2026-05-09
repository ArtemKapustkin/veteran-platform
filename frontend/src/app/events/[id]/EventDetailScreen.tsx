"use client";

import Link from "next/link";
import { Marker } from "react-map-gl/maplibre";
import { Btn } from "@/components/atoms/Btn";
import { Photo } from "@/components/atoms/Photo";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { EventBadges } from "@/components/shared/EventBadges";
import { SeatBar } from "@/components/shared/SeatBar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { EventPin } from "@/components/map/EventPin";
import {
  BackIcon,
  CalIcon,
  CheckIcon,
  HeartFillIcon,
  HeartIcon,
  PinIcon,
  ShareIcon,
  TgIcon,
} from "@/components/icons";
import { CATEGORIES } from "@/data/categories";
import type { AppEvent } from "@/data/events";
import { useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { telegramShareUrl } from "@/lib/share";

export function EventDetailScreen({ event }: { event: AppEvent }) {
  const mounted = useMounted();
  const setRsvp = useEventsStore((s) => s.setRsvp);
  const toggleSaved = useEventsStore((s) => s.toggleSaved);
  const isRsvpReal = useEventsStore((s) => s.rsvpIds.includes(event.id));
  const isSavedReal = useEventsStore((s) => s.savedIds.includes(event.id));
  const isRsvp = mounted && isRsvpReal;
  const isSaved = mounted && isSavedReal;

  const handleShare = () => {
    window.open(
      telegramShareUrl(event),
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleRsvp = async (on: boolean) => {
    try {
      await setRsvp(event.id, on);
    } catch (e) {
      window.alert(`Не вдалось оформити запис: ${(e as Error).message}`);
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
            onClick={() => toggleSaved(event.id)}
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
          <button
            type="button"
            onClick={handleShare}
            aria-label="Поділитись"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl backdrop-blur-md shadow-soft"
            style={{ background: "rgba(255,255,255,0.92)" }}
          >
            <ShareIcon size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5.5 pt-5 pb-28">
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
        className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 px-4.5 pt-3.5 pb-6.5 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 -1px 0 rgba(0,0,0,0.04)",
        }}
      >
        {isRsvp ? (
          <>
            <div
              className="flex flex-1 flex-col gap-0.5"
              style={{ fontSize: 14 }}
            >
              <span
                className="flex items-center gap-1.5"
                style={{ color: "#0E6E45", fontWeight: 600 }}
              >
                <CheckIcon size={16} stroke="#0E6E45" /> Ти йдеш
              </span>
              <span
                className="text-text2"
                style={{ fontSize: 12, fontWeight: 400 }}
              >
                Хочеш покликати ще одного?
              </span>
            </div>
            <Btn
              kind="invite"
              size="md"
              icon={<TgIcon size={15} />}
              onClick={handleShare}
            >
              Запросити
            </Btn>
            <Btn
              kind="ghost"
              size="md"
              onClick={() => handleRsvp(false)}
              className="text-text2 px-2.5"
            >
              Скасувати
            </Btn>
          </>
        ) : (
          <>
            <Btn
              kind="invite"
              size="lg"
              fullWidth
              icon={<TgIcon size={18} />}
              onClick={handleShare}
              className="flex-1"
            >
              Покликати побратима
            </Btn>
            <Btn
              kind="secondary"
              size="lg"
              onClick={() => handleRsvp(true)}
              className="px-4.5"
            >
              Я йду
            </Btn>
          </>
        )}
      </div>
    </main>
  );
}
