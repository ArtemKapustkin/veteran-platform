"use client";

import { useRouter } from "next/navigation";
import {
  FilterIcon,
  GearIcon,
  HeartIcon,
  ListIcon,
  PinIcon,
} from "@/components/icons";
import type { ReactNode } from "react";

export type ToolbarTab = "filters" | "map" | "list" | "saved" | "settings";

const ITEMS: { id: ToolbarTab; label: string; icon: ReactNode }[] = [
  { id: "filters",  label: "Фільтри",   icon: <FilterIcon size={22} /> },
  { id: "map",      label: "Карта",     icon: <PinIcon size={22} /> },
  { id: "list",     label: "Список",    icon: <ListIcon size={22} /> },
  { id: "saved",    label: "Збережені", icon: <HeartIcon size={22} /> },
  { id: "settings", label: "Налашт.",   icon: <GearIcon size={22} /> },
];

export function BottomToolbar({ active }: { active: ToolbarTab }) {
  const router = useRouter();

  const handle = (id: ToolbarTab) => {
    switch (id) {
      case "map":
        router.push("/map");
        break;
      case "list":
        router.push("/list");
        break;
      case "saved":
        router.push("/saved");
        break;
      case "filters": {
        const url = new URL(window.location.href);
        url.searchParams.set("filters", "1");
        router.push(url.pathname + url.search, { scroll: false });
        break;
      }
      case "settings": {
        const url = new URL(window.location.href);
        url.searchParams.set("a11y", "1");
        router.push(url.pathname + url.search, { scroll: false });
        break;
      }
    }
  };

  return (
    <nav
      aria-label="Головна навігація"
      className="flex items-center justify-around rounded-[20px] px-1.5 py-2.5 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.92)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        boxShadow: "var(--shadow-floating)",
      }}
    >
      {ITEMS.map((it) => {
        const on = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => handle(it.id)}
            aria-current={on ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1"
            style={{ color: on ? "var(--color-text)" : "var(--color-text2)" }}
          >
            {it.icon}
            <span
              style={{
                fontSize: 10.5,
                fontWeight: on ? 600 : 500,
                letterSpacing: "-0.01em",
              }}
            >
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
