"use client";

import type { AppEvent } from "@/data/events";
import { ViewportSwitch } from "@/components/ViewportSwitch";
import { DesktopEventDetailShell } from "@/components/desktop/DesktopEventDetailShell";
import { EventDetailScreen } from "./EventDetailScreen";

/**
 * Mobile gets the dedicated full-screen detail (S05). Desktop gets a
 * LUN-style 2-column article + sticky CTA card. Both screens are real
 * pages now — the desktop split-view (`/map?event=<id>`) is still
 * available from card clicks for an in-context preview, but the
 * standalone `/events/[id]` URL renders a full detail on either viewport.
 */
export function EventDetailViewport({ event }: { event: AppEvent }) {
  return (
    <ViewportSwitch
      mobile={<EventDetailScreen event={event} />}
      desktop={<DesktopEventDetailShell event={event} />}
    />
  );
}
