"use client";

import { Marker } from "react-map-gl/maplibre";
import { useRouter } from "next/navigation";
import type { AppEvent } from "@/data/events";
import { categoryMeta } from "@/data/categories";
import { EventPin } from "./EventPin";

export function PinLayer({
  events,
  focusedId,
}: {
  events: AppEvent[];
  focusedId?: string | null;
}) {
  const router = useRouter();

  return (
    <>
      {events.map((e) => {
        const meta = categoryMeta(e.category);
        const focused = focusedId === e.id;
        const lng = e.location?.lng;
        const lat = e.location?.lat;
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
        return (
          <Marker
            key={e.id}
            longitude={lng}
            latitude={lat}
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
