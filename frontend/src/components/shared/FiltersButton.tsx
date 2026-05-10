"use client";

import { useRouter } from "next/navigation";
import { FilterIcon } from "@/components/icons";
import { useMounted } from "@/lib/useMounted";
import { countActiveFilters, useFiltersStore } from "@/lib/useFilters";

/**
 * Pill-style "Фільтри" button used on the mobile map/list screens. Sets
 * `?filters=1` so `Overlays` shows the FiltersSheet, and renders a small
 * count badge once any chip is selected.
 */
export function FiltersButton() {
  const router = useRouter();
  const mounted = useMounted();
  const count = useFiltersStore((s) =>
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

  const open = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("filters", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Відкрити фільтри"
      className="bg-surface text-text flex items-center gap-1.5 rounded-full px-3.5 py-2 shadow-soft"
      style={{ fontSize: 13, fontWeight: 500 }}
    >
      <FilterIcon size={14} />
      Фільтри
      {mounted && count > 0 ? (
        <span
          aria-label={`${count} активних фільтрів`}
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
          {count}
        </span>
      ) : null}
    </button>
  );
}
