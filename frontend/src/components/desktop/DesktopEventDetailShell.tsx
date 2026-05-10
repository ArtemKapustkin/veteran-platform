"use client";

import Link from "next/link";
import { useState } from "react";
import { Marker } from "react-map-gl/maplibre";
import { Avatar } from "@/components/atoms/Avatar";
import { Btn } from "@/components/atoms/Btn";
import { Photo } from "@/components/atoms/Photo";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { EventBadges } from "@/components/shared/EventBadges";
import { SeatBar } from "@/components/shared/SeatBar";
import { CancelRsvpAction } from "@/components/shared/CancelRsvpAction";
import { MapCanvas } from "@/components/map/MapCanvas";
import { EventPin } from "@/components/map/EventPin";
import { Overlays } from "@/components/sheets/Overlays";
import { DesktopNav } from "./DesktopNav";
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
import { OrganizerInvitesPanel } from "@/components/shared/OrganizerInvitesPanel";
import { categoryMeta } from "@/data/categories";
import { safeMapPoint, type AppEvent } from "@/data/events";
import { useEventsStore } from "@/lib/store";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useMounted } from "@/lib/useMounted";
import { toast } from "@/lib/useToast";

/**
 * Desktop full event detail. LUN-style: top nav + a 2-column article
 * (hero/description on the left, sticky CTA card on the right). Mirrors
 * the mobile S05 content but laid out for wide viewports.
 */
export function DesktopEventDetailShell({ event }: { event: AppEvent }) {
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

  const meta = categoryMeta(event.category);
  const mapPt = safeMapPoint(event.location);

  const handleRsvp = async (on: boolean) => {
    if (rsvpPending) return;
    if (!requireAuth({ hint: on ? "Щоб записатись на подію" : undefined })) return;
    setRsvpPending(true);
    try {
      await setRsvp(event.id, on);
      try {
        navigator.vibrate?.(on ? 18 : 8);
      } catch {
        /* no-op */
      }
      if (on) {
        const others = Math.max(0, event.count);
        toast.success(
          "Записали тебе!",
          others > 0 ? `Разом із ${others} своїми.` : undefined,
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

  return (
    <div className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}>
      <DesktopNav />

      <main
        className="mx-auto w-full px-8 pt-6 pb-16"
        style={{ maxWidth: 1240 }}
      >
        {/* Breadcrumb / back link */}
        <Link
          href="/map"
          className="text-text2 hover:text-text inline-flex items-center gap-1.5"
          style={{ fontSize: 13.5, fontWeight: 500 }}
        >
          <BackIcon size={16} />
          Назад на карту
        </Link>

        <div
          className="mt-5 grid items-start gap-8"
          style={{ gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)" }}
        >
          {/* LEFT — hero + meta + body */}
          <article className="flex min-w-0 flex-col">
            <div className="relative">
              <Photo
                tone={event.coverTone}
                height={360}
                radius={20}
                imageUrl={event.coverImageUrl}
                label={event.coverImageUrl ? undefined : "EVENT · COVER 16:9"}
                alt={`Обкладинка події «${event.title}»`}
              />
              <div className="absolute right-3.5 top-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!requireAuth({ hint: "Щоб зберегти подію" })) return;
                    toggleSaved(event.id);
                  }}
                  aria-label={
                    isSaved ? "Видалити зі збережених" : "Зберегти подію"
                  }
                  aria-pressed={isSaved}
                  className="shadow-soft flex h-10 w-10 items-center justify-center rounded-xl backdrop-blur-md"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    color: isSaved ? "#C04848" : "var(--color-text)",
                  }}
                >
                  {isSaved ? (
                    <HeartFillIcon size={20} />
                  ) : (
                    <HeartIcon size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-4">
              <EventBadges badges={event.badges} />
              <h1
                className="text-text m-0"
                style={{
                  fontSize: 38,
                  fontWeight: 600,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                }}
              >
                {event.title}
              </h1>
              <div
                className="text-text2 flex flex-wrap items-center gap-x-5 gap-y-2"
                style={{ fontSize: 14.5 }}
              >
                <span className="flex items-center gap-2">
                  <CalIcon size={16} />
                  {event.date} · {event.time}
                </span>
                <span className="flex items-center gap-2">
                  <PinIcon size={16} />
                  {event.place} · {event.distance}
                </span>
              </div>
            </div>

            <p
              className="text-text mt-7 mb-0"
              style={{
                fontSize: 16.5,
                lineHeight: 1.7,
                letterSpacing: "-0.005em",
                maxWidth: 640,
              }}
            >
              {event.description}
            </p>

            {event.attendees.length > 0 ? (
              <section className="border-border-soft mt-9 rounded-2xl border bg-white p-5.5">
                <div className="flex items-center justify-between gap-3">
                  <h2
                    className="text-text m-0"
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {event.beFirst
                      ? "Поки що ніхто не йде"
                      : `${event.count} ветеранів уже йдуть`}
                  </h2>
                  {event.attendeeNames.length > 0 ? (
                    <span className="text-text2" style={{ fontSize: 13 }}>
                      {event.attendeeNames.join(", ")}
                      {event.attendees.length > event.attendeeNames.length
                        ? " та інші"
                        : ""}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  {event.attendees.slice(0, 8).map((p, i) => (
                    <Avatar
                      key={`${p.initial}-${i}`}
                      initial={p.initial}
                      tone={p.tone}
                      size={42}
                    />
                  ))}
                  {event.attendees.length > 8 ? (
                    <span
                      className="text-text2 ml-1"
                      style={{ fontSize: 13 }}
                    >
                      +{event.attendees.length - 8}
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="mt-9">
              <h2
                className="text-text m-0"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Локація
              </h2>
              <div className="text-text2 mt-1" style={{ fontSize: 13.5 }}>
                {event.place}
              </div>
              <div
                className="border-border-soft relative mt-3 w-full overflow-hidden rounded-2xl border"
                style={{ height: 320 }}
                aria-label="Місце події на карті"
              >
                <MapCanvas
                  longitude={mapPt.lng}
                  latitude={mapPt.lat}
                  zoom={14}
                  interactive={false}
                >
                  <Marker
                    longitude={mapPt.lng}
                    latitude={mapPt.lat}
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
            </section>
          </article>

          {/* RIGHT — sticky action card */}
          <aside style={{ position: "sticky", top: 84 }}>
            <div
              className="border-border-soft flex flex-col gap-4 rounded-2xl border bg-white p-5"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="flex flex-col gap-1">
                <div
                  className="text-text2"
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  Коли
                </div>
                <div
                  className="text-text"
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {event.date} · {event.time}
                </div>
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

              <div className="border-border-soft -mx-5 mt-1 border-t" />

              {isRsvp ? (
                <div className="flex flex-col gap-3">
                  <div
                    className="flex items-start gap-3 rounded-xl px-3.5 py-3"
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
                          Разом із {event.count} своїми.
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <OrganizerInvitesPanel event={event} />
                  <CancelRsvpAction
                    onConfirm={() => handleRsvp(false)}
                    align="center"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <Btn
                    kind="invite"
                    size="lg"
                    fullWidth
                    icon={<UserIcon size={18} />}
                    onClick={openGroup}
                  >
                    Запросити побратима
                  </Btn>
                  <Btn
                    kind="secondary"
                    size="lg"
                    fullWidth
                    loading={rsvpPending}
                    onClick={() => handleRsvp(true)}
                  >
                    Зареєструватись на подію
                  </Btn>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Overlays desktop />

      {groupOpen ? (
        <GroupRegisterSheet event={event} onClose={() => setGroupOpen(false)} />
      ) : null}
    </div>
  );
}
