"use client";

import { useRouter } from "next/navigation";
import { HeartIcon, PinIcon, UserIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import type { ReactNode } from "react";

/**
 * Active tab the parent screen reports. The toolbar only renders three
 * primary destinations — `"list"` lights up the same "Події" tab as `"map"`
 * so map↔list lives inside the screen via the ViewToggle, not here.
 *
 * `"settings"` is kept for backward compat but maps onto the `"account"`
 * tab; the dedicated settings entry was folded into the account screen.
 */
export type ToolbarTab = "map" | "list" | "saved" | "account" | "settings";

type ToolbarItem = {
  id: "map" | "saved" | "account";
  label: string;
  icon: ReactNode;
  requireAuth?: boolean;
};

const ALL_ITEMS: ToolbarItem[] = [
  { id: "map",     label: "Події",     icon: <PinIcon size={22} /> },
  { id: "saved",   label: "Збережені", icon: <HeartIcon size={22} />, requireAuth: true },
  { id: "account", label: "Акаунт",    icon: <UserIcon size={22} /> },
];

export function BottomToolbar({ active }: { active: ToolbarTab }) {
  const router = useRouter();
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  // SSR/first paint: guest layout. Avoids hydration mismatch on the first
  // render after a logged-in reload.
  const isLoggedIn = mounted && loggedIn;

  const items = ALL_ITEMS.filter((it) => !it.requireAuth || isLoggedIn);

  const handle = (id: ToolbarItem["id"]) => {
    switch (id) {
      case "map":
        router.push("/map");
        break;
      case "saved":
        router.push("/saved");
        break;
      case "account":
        router.push("/account");
        break;
    }
  };

  // Map legacy "settings" label onto "account" so existing callers (e.g.
  // the saved screen) still highlight the right tab without a churn.
  const normalizedActive: ToolbarTab =
    active === "settings" ? "account" : active;

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
      {items.map((it) => {
        const on =
          it.id === normalizedActive ||
          (it.id === "map" && normalizedActive === "list");
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => handle(it.id)}
            aria-current={on ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-1"
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
