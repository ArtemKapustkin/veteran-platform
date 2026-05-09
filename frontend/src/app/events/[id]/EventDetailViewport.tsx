"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsDesktop } from "@/lib/useIsDesktop";
import type { AppEvent } from "@/data/events";
import { EventDetailScreen } from "./EventDetailScreen";

/**
 * Mobile gets the dedicated full-screen detail (S05).
 * Desktop has no standalone detail page — clicking a card or pin focuses
 * the pin in the split view, so we redirect to `/map?event=<id>`.
 */
export function EventDetailViewport({ event }: { event: AppEvent }) {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/map?event=${event.id}`);
    }
  }, [isDesktop, event.id, router]);

  if (isDesktop) return null;
  return <EventDetailScreen event={event} />;
}
