"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, FilterIcon, PinIcon } from "@/components/icons";
import { CityPicker } from "@/components/sheets/CityPicker";
import { cityLocative } from "@/data/cities";
import { useMounted } from "@/lib/useMounted";
import { useCityStore } from "@/lib/useCity";
import { countActiveFilters, useFiltersStore } from "@/lib/useFilters";
import { useFilteredEvents } from "@/lib/useFilteredEvents";

export function DesktopFilterBar() {
  const router = useRouter();
  const mounted = useMounted();
  // Until the persisted store has hydrated, render the SSR default
  // ("Київ + 20 км") so server and first-paint markup match.
  const city = useCityStore((s) => s.name);
  const radiusKm = useCityStore((s) => s.radiusKm);
  const setCity = useCityStore((s) => s.setCity);
  const setRadius = useCityStore((s) => s.setRadius);
  const filterCount = useFiltersStore((s) =>
    countActiveFilters({
      categories: s.categories,
      forWhom: s.forWhom,
      costTiers: s.costTiers,
      districts: s.districts,
      accessibility: s.accessibility,
      participants: s.participants,
      repeat: s.repeat,
      isRegular: s.isRegular,
      datePreset: s.datePreset,
      customDate: s.customDate,
    }),
  );
  const { events, loading } = useFilteredEvents();
  const [cityOpen, setCityOpen] = useState(false);
  const cityChipRef = useRef<HTMLButtonElement>(null);

  const onFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("filters", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  const locative = mounted ? cityLocative(city) : "Києві";

  return (
    <div className="border-border-soft flex flex-shrink-0 items-center gap-3 border-b bg-white px-7 py-3.5">
      <div className="min-w-0 flex-1">
        <h1
          className="text-text m-0 truncate"
          style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Події у {locative}
        </h1>
        <div
          className="text-text2 mt-0.5"
          style={{ fontSize: 12, fontWeight: 500 }}
        >
          {loading ? "Завантаження…" : `${events.length} подій цього тижня`}
        </div>
      </div>

      <div className="relative">
        <button
          ref={cityChipRef}
          type="button"
          onClick={() => setCityOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={cityOpen}
          className="text-text flex items-center gap-2 rounded-[10px] bg-[#F8F6F1] px-3.5 py-2.5 hover:brightness-95"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          <PinIcon size={15} />
          {mounted ? `${city} + ${radiusKm} км` : "Київ + 20 км"}
          <ChevronDownIcon size={13} stroke="var(--color-text2)" />
        </button>
        {cityOpen ? (
          <CityPicker
            city={city}
            radiusKm={radiusKm}
            anchorRef={cityChipRef}
            onCity={setCity}
            onRadius={setRadius}
            onClose={() => setCityOpen(false)}
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={onFilters}
        className="text-text flex items-center gap-2 rounded-[10px] bg-[#F8F6F1] px-4 py-2.5 hover:brightness-95"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        <FilterIcon size={15} />
        Фільтри
        {mounted && filterCount > 0 ? (
          <span
            aria-label={`${filterCount} активних фільтрів`}
            className="ml-0.5 inline-flex items-center justify-center rounded-full"
            style={{
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              background: "#1A1A1A",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {filterCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
