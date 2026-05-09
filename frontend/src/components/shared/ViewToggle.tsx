"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ViewKey = "map" | "list";

const TABS: { id: ViewKey; label: string; href: "/map" | "/list" }[] = [
  { id: "map", label: "Картка", href: "/map" },
  { id: "list", label: "Список", href: "/list" },
];

/**
 * Pill-shaped Картка/Список switcher used at the top of the mobile map and
 * list screens. Active state is derived from the `view` prop rather than
 * the pathname so the parent screen owns the source of truth.
 *
 * Preserves the current `?event=…` query param when switching, so a focused
 * pin survives the round-trip.
 */
export function ViewToggle({ view }: { view: ViewKey }) {
  const params = useSearchParams();
  const search = params.toString();
  const suffix = search ? `?${search}` : "";

  return (
    <div
      role="tablist"
      aria-label="Перегляд"
      className="bg-surface inline-flex gap-0.5 rounded-full p-0.5 shadow-soft"
    >
      {TABS.map((t) => {
        const on = t.id === view;
        return (
          <Link
            key={t.id}
            role="tab"
            aria-selected={on}
            href={`${t.href}${suffix}`}
            className="rounded-full px-4 py-2 transition-colors"
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.005em",
              background: on ? "#1A1A1A" : "transparent",
              color: on ? "#fff" : "var(--color-text2)",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
