"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Btn } from "@/components/atoms/Btn";
import { Photo } from "@/components/atoms/Photo";
import { CounterBlock } from "@/components/shared/CounterBlock";
import { EventBadges } from "@/components/shared/EventBadges";
import { SeatBar } from "@/components/shared/SeatBar";
import {
  ArrowIcon,
  CalIcon,
  ClockIcon,
  PinIcon,
  UserIcon,
  WalkIcon,
} from "@/components/icons";
import { GroupRegisterSheet } from "@/components/sheets/GroupRegisterSheet";
import type { AppEvent } from "@/data/events";
import { useAuthGuard } from "@/lib/useAuthGuard";

// Snap heights as a fraction of the dialog container (the map view).
//   closed   → trigger onClose
//   default  → ~62% of viewport, sized to fit the "preview" content
//              (tags + title + meta + who's going + CTA) without
//              scrolling on typical phone heights. The sheet stays at
//              this height on open and only grows when the user drags.
//   full     → 96% (leaves a sliver of map at the top so it doesn't
//              feel like a full-screen takeover). Reveals the cover
//              photo + description.
const SNAP_DEFAULT = 0.62;
const SNAP_FULL = 0.96;
// Boundaries used when deciding which snap to settle on after a drag,
// expressed as fractions of the container height.
const CLOSE_BOUNDARY = 0.32;
const EXPAND_BOUNDARY = 0.8;
// Velocity bias — quick flicks "win" the snap in the flick direction
// even if the position is closer to the previous snap. px / ms.
const FLICK_VELOCITY = 0.5;

type Snap = "default" | "full";

export function EventSheet({
  event,
  onClose,
}: {
  event: AppEvent;
  onClose: () => void;
}) {
  // The map-pin sheet is a quick preview: title, meta, attendee count,
  // and two CTAs — invite a buddy (accent) and jump to the full event
  // page. Direct RSVP / share still live on /events/[id] to keep this
  // surface lightweight.

  const requireAuth = useAuthGuard();
  const [groupOpen, setGroupOpen] = useState(false);
  const openGroup = () => {
    if (!requireAuth({ hint: "Щоб запросити побратима" })) return;
    setGroupOpen(true);
  };

  // ─── Draggable-sheet state ────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const [snap, setSnap] = useState<Snap>("default");
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Track pointer start position + timestamp so we can compute velocity at
  // release and bias snap decisions toward a "flick" direction.
  const dragStartRef = useRef<{
    y: number;
    t: number;
    pointerId: number;
  } | null>(null);

  // Measure the dialog container so we can convert the snap fractions to
  // pixels (and compute the live height during a drag).
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setContainerH(node.clientHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setContainerH(node.clientHeight));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Resolved height for the current snap, minus any drag delta. Clamped
  // to [0, SNAP_FULL] so the sheet never grows past the cap or below
  // zero.
  const baseHeightPx =
    containerH * (snap === "full" ? SNAP_FULL : SNAP_DEFAULT);
  const sheetHeightPx = Math.min(
    containerH * SNAP_FULL,
    Math.max(0, baseHeightPx - dragDelta),
  );

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Ignore secondary buttons (right-click, middle-click).
    if (e.button !== 0 && e.pointerType === "mouse") return;
    try {
      // Pointer capture lets us keep getting move/up events even when the
      // pointer leaves the handle (drag goes way past the bottom of the
      // sheet). May throw with synthetic events from tests; ignore.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    dragStartRef.current = {
      y: e.clientY,
      t: e.timeStamp,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    setDragDelta(e.clientY - start.y);
  }, []);

  const settle = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer may already have been released.
      }
      const totalDelta = e.clientY - start.y;
      const dt = Math.max(1, e.timeStamp - start.t);
      const velocity = totalDelta / dt; // +ve = downward (toward close)

      // Settle: pick the snap that best matches where the sheet currently
      // sits, with a velocity bias toward flick direction.
      const heightFraction = sheetHeightPx / Math.max(1, containerH);
      let next: Snap | "closed";
      if (velocity > FLICK_VELOCITY) {
        // Strong flick down → close-or-default depending on prior snap.
        next = snap === "full" ? "default" : "closed";
      } else if (velocity < -FLICK_VELOCITY) {
        next = "full";
      } else if (heightFraction < CLOSE_BOUNDARY) {
        next = "closed";
      } else if (heightFraction > EXPAND_BOUNDARY) {
        next = "full";
      } else {
        next = "default";
      }

      dragStartRef.current = null;
      setIsDragging(false);
      setDragDelta(0);

      if (next === "closed") {
        onClose();
      } else {
        setSnap(next);
      }
    },
    [containerH, onClose, sheetHeightPx, snap],
  );

  // Render height policy:
  //  • default snap, not dragging → CSS percentage (rock-solid: same
  //    declared value on every render, so the browser never animates
  //    on open). The sheet sits exactly at SNAP_DEFAULT and only moves
  //    when the user grabs the handle.
  //  • dragging or full snap → pixel value (needed for live drag math
  //    and for the transition between snaps).
  // Switching from % to px happens at the same moment we set transition
  // to "none" (drag start), so no animation fires across the unit change.
  const useDefaultPercent = !isDragging && snap === "default";
  const sheetStyle: CSSProperties = {
    height: useDefaultPercent
      ? `${SNAP_DEFAULT * 100}%`
      : `${sheetHeightPx}px`,
    boxShadow: "var(--shadow-sheet)",
    transition: isDragging
      ? "none"
      : "height 260ms cubic-bezier(0.4, 0, 0.2, 1)",
    touchAction: "pan-y",
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-sheet-title"
      className="absolute inset-0 z-40"
    >
      {/* Backdrop: everything above the sheet closes on tap. Sized
          dynamically so the click target tracks the sheet position. */}
      <button
        type="button"
        aria-label="Закрити"
        onClick={onClose}
        className="absolute inset-x-0 top-0 w-full cursor-default bg-transparent"
        style={{
          height: useDefaultPercent
            ? `${(1 - SNAP_DEFAULT) * 100}%`
            : `calc(100% - ${sheetHeightPx}px)`,
          transition: isDragging
            ? "none"
            : "height 260ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <div
        className="bg-surface absolute inset-x-0 bottom-0 flex flex-col rounded-t-3xl"
        style={sheetStyle}
      >
        {/* Drag area — captures pointer events for drag-to-resize.
            Hit target is generous (44px) for touch even though the visual
            handle is small. role/label so screen readers can describe it. */}
        <div
          role="separator"
          aria-label={
            snap === "full"
              ? "Перетягни вниз, щоб згорнути або закрити"
              : "Перетягни вгору, щоб розгорнути, або вниз, щоб закрити"
          }
          aria-orientation="horizontal"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={settle}
          onPointerCancel={settle}
          className="flex flex-shrink-0 cursor-grab justify-center pt-2.5 pb-2 active:cursor-grabbing"
          style={{ touchAction: "none" }}
        >
          <span
            className="block h-1 w-9 rounded-sm"
            style={{
              background: isDragging ? "#9CA3AF" : "#D9D6CD",
              transition: "background-color 120ms ease-out",
            }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-3.5 overflow-auto px-5 pt-1.5 pb-5.5 overscroll-contain">
          {snap === "full" ? (
            <Photo
              tone={event.coverTone}
              height={140}
              radius={14}
              imageUrl={event.coverImageUrl}
              label={event.coverImageUrl ? undefined : "EVENT · COVER"}
              alt={`Обкладинка події «${event.title}»`}
            />
          ) : null}
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
          {snap === "full" && event.description ? (
            <p
              className="text-text m-0"
              style={{
                fontSize: 15,
                lineHeight: 1.6,
                letterSpacing: "-0.005em",
              }}
            >
              {event.description}
            </p>
          ) : null}
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
            <Link
              href={`/events/${event.id}`}
              aria-label={`Перейти до події «${event.title}»`}
            >
              <Btn
                kind="secondary"
                size="lg"
                fullWidth
                asLink
                iconRight={<ArrowIcon size={18} />}
              >
                Перейти до події
              </Btn>
            </Link>
          </div>
        </div>
      </div>

      {groupOpen ? (
        <GroupRegisterSheet event={event} onClose={() => setGroupOpen(false)} />
      ) : null}
    </div>
  );
}
