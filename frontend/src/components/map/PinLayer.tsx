"use client";

import { Marker } from "react-map-gl/maplibre";
import { useRouter } from "next/navigation";
import type { AppEvent } from "@/data/events";
import { CATEGORIES } from "@/data/categories";
import { EventPin } from "./EventPin";

export function PinLayer({
  events,
  focusedId,
}: {
  events: AppEvent[];
  focusedId?: number | null;
}) {
  const router = useRouter();

  return (
    <>
      {events.map((e) => {
        const meta = CATEGORIES[e.category];
        const focused = focusedId === e.id;
        return (
          <Marker
            key={e.id}
            longitude={e.location.lng}
            latitude={e.location.lat}
            anchor="bottom"
          >
            <EventPin
              color={meta.pinColor}
              count={e.count}
              empty={e.beFirst}
              focused={focused}
              ariaLabel={`${e.title}, ${e.date} о ${e.time}, ${e.count} ветеранів`}
              onClick={() => router.push(`/map?event=${e.id}`, { scroll: false })}
            />
          </Marker>
        );
      })}
    </>
  );
}
