"use client";

import { useEffect, useRef, type RefObject } from "react";
import { CheckIcon, PinIcon } from "@/components/icons";
import { CITIES } from "@/data/cities";
import { CITY_RADII } from "@/data/cities";

/**
 * Compact popover for choosing a city + search radius. Rendered by
 * `DesktopFilterBar` directly under the city chip (relative anchor).
 *
 * Closes on outside-click, Escape, or after the user picks a city.
 * Radius chips don't auto-close — the user often wants to tweak the
 * radius after switching cities.
 *
 * `anchorRef` (the toggle button) is excluded from the outside-click
 * check; otherwise the chip's mousedown would close the popover and the
 * subsequent click would re-open it on the same gesture.
 */
export function CityPicker({
  city,
  radiusKm,
  anchorRef,
  onCity,
  onRadius,
  onClose,
}: {
  city: string;
  radiusKm: number;
  anchorRef?: RefObject<HTMLElement | null>;
  onCity: (name: string) => void;
  onRadius: (km: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, anchorRef]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Вибір міста"
      className="border-border-soft absolute left-0 top-full z-30 mt-2 flex flex-col rounded-2xl border bg-white shadow-soft"
      style={{ width: 280, animation: "var(--animate-pop-down)" }}
    >
      <div className="border-border-soft flex items-center gap-2 border-b px-4 pt-3.5 pb-2.5">
        <PinIcon size={14} stroke="var(--color-text2)" />
        <span
          className="text-text-muted"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Місто
        </span>
      </div>

      <ul className="flex max-h-[260px] flex-col overflow-auto py-1.5" role="listbox">
        {CITIES.map((c) => {
          const active = c.name === city;
          return (
            <li key={c.name}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onCity(c.name);
                  onClose();
                }}
                className="text-text flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-[#F8F6F1]"
                style={{ fontSize: 14, fontWeight: active ? 600 : 500 }}
              >
                <span>{c.name}</span>
                {active ? (
                  <CheckIcon size={15} stroke="var(--color-text)" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-border-soft flex flex-col gap-2 border-t px-4 pt-3 pb-3.5">
        <span
          className="text-text-muted"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Радіус пошуку
        </span>
        <div className="flex flex-wrap gap-1.5">
          {CITY_RADII.map((km) => {
            const on = km === radiusKm;
            return (
              <button
                key={km}
                type="button"
                onClick={() => onRadius(km)}
                aria-pressed={on}
                className="rounded-full transition-colors"
                style={{
                  background: on ? "#1A1A1A" : "#F8F6F1",
                  color: on ? "#fff" : "var(--color-text)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  padding: "6px 11px",
                }}
              >
                +{km} км
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
