"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { getEventById } from "@/data/events";
import { EventSheet } from "./EventSheet";
import { FiltersSheet } from "./FiltersSheet";
import { AccessibilityDrawer } from "./AccessibilityDrawer";

/**
 * Reads query params and renders whichever overlay should be visible.
 * Closing strips the overlay's param from the URL.
 *
 *   ?event=<id> -> EventSheet (S04, mobile only)
 *   ?filters=1  -> FiltersSheet (S07)
 *   ?a11y=1     -> AccessibilityDrawer (S09)
 *
 * `showEventSheet` lets callers (the map screen) opt-in to the event sheet
 * while pages like /list or /saved suppress it (they already navigate to
 * the full detail screen instead).
 *
 * `desktop` switches the FiltersSheet from a fullscreen mobile sheet to a
 * slide-in 480px panel from the right with a dimmed backdrop, matching the
 * desktop prototype.
 */
export function Overlays({
  showEventSheet = false,
  desktop = false,
}: {
  showEventSheet?: boolean;
  desktop?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const close = useCallback(
    (...keys: string[]) => {
      const next = new URLSearchParams(params.toString());
      keys.forEach((k) => next.delete(k));
      const search = next.toString();
      const url =
        typeof window === "undefined"
          ? "/"
          : window.location.pathname + (search ? "?" + search : "");
      router.push(url, { scroll: false });
    },
    [router, params],
  );

  const eventId = params.get("event");
  const filters = params.get("filters");
  const a11y = params.get("a11y");
  const anyOpen = Boolean(
    (showEventSheet && eventId) || filters || a11y,
  );

  useEffect(() => {
    if (!anyOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const keys: string[] = [];
      if (showEventSheet && eventId) keys.push("event");
      if (filters) keys.push("filters");
      if (a11y) keys.push("a11y");
      close(...keys);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [anyOpen, showEventSheet, eventId, filters, a11y, close]);

  return (
    <>
      {showEventSheet && eventId ? (
        (() => {
          const event = getEventById(eventId);
          if (!event) return null;
          return <EventSheet event={event} onClose={() => close("event")} />;
        })()
      ) : null}
      {filters ? (
        desktop ? (
          <DesktopSlideInPanel onClose={() => close("filters")}>
            <FiltersSheet onClose={() => close("filters")} />
          </DesktopSlideInPanel>
        ) : (
          <FiltersSheet onClose={() => close("filters")} />
        )
      ) : null}
      {a11y ? <AccessibilityDrawer onClose={() => close("a11y")} /> : null}
    </>
  );
}

/**
 * Fixed-position dimmed backdrop with a 480px slide-in panel anchored to
 * the right edge. The backdrop is the click target that closes the overlay;
 * clicks inside the panel are stopped so they don't bubble up.
 */
function DesktopSlideInPanel({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0"
      style={{ zIndex: 60, background: "rgba(20,18,15,0.4)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 flex flex-col"
        style={{
          width: "min(480px, 92vw)",
          background: "var(--color-bg)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.16)",
          animation: "var(--animate-slide-in-right)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
