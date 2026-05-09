"use client";

import Link from "next/link";
import { ViewportSwitch } from "@/components/ViewportSwitch";
import { DesktopEventDetailShell } from "@/components/desktop/DesktopEventDetailShell";
import { Btn } from "@/components/atoms/Btn";
import { useEvent } from "@/lib/useEvents";
import { EventDetailScreen } from "./EventDetailScreen";

/**
 * Mobile gets the dedicated full-screen detail (S05). Desktop gets a
 * LUN-style 2-column article + sticky CTA card. Both screens are real
 * pages now — the desktop split-view (`/map?event=<id>`) is still
 * available from card clicks for an in-context preview, but the
 * standalone `/events/[id]` URL renders a full detail on either viewport.
 *
 * Now driven by the API: a small fetch, plus a graceful loading/missing
 * state so a deep link from a deleted event doesn't render a broken page.
 */
export function EventDetailViewport({ id }: { id: string }) {
  const { event, loading, error } = useEvent(id);

  if (loading && !event) return <CenterMessage>Завантажуємо подію…</CenterMessage>;
  if (error || !event)
    return (
      <CenterMessage>
        <p className="m-0" style={{ fontSize: 18, fontWeight: 600 }}>
          Подію не знайдено
        </p>
        <p className="text-text2 mt-2 mb-5" style={{ fontSize: 14 }}>
          Можливо, її скасували або посилання застаріло.
        </p>
        <Link href="/map">
          <Btn kind="secondary" size="md" asLink>
            На карту
          </Btn>
        </Link>
      </CenterMessage>
    );

  return (
    <ViewportSwitch
      mobile={<EventDetailScreen event={event} />}
      desktop={<DesktopEventDetailShell event={event} />}
    />
  );
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="bg-bg flex flex-col items-center justify-center px-6 text-center"
      style={{ minHeight: "100dvh" }}
    >
      {children}
    </main>
  );
}
