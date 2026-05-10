"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AccessIcon, HeartIcon, PinIcon, UsersIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import type { ReactNode } from "react";

/**
 * Active tab the parent screen reports.
 *
 * - `"map"` / `"list"` light up the same "Події" tab — map↔list lives
 *   inside the screen via the ViewToggle, not here.
 * - `"account"` / `"settings"` are kept for backward-compat callers but no
 *   longer correspond to a rendered tab: account moved into the header,
 *   so on /account nothing in the toolbar is highlighted.
 */
export type ToolbarTab =
  | "map"
  | "list"
  | "communities"
  | "saved"
  | "account"
  | "settings"
  | "menu";

type ToolbarItem = {
  id: "map" | "communities" | "saved" | "menu";
  label: string;
  icon: ReactNode;
  requireAuth?: boolean;
};

// Order mirrors the desktop nav ("Події поруч" → "Спільноти поруч" → …) so
// muscle memory transfers between the two layouts.
const ALL_ITEMS: ToolbarItem[] = [
  { id: "map",         label: "Події",       icon: <PinIcon size={22} /> },
  { id: "communities", label: "Спільноти",   icon: <UsersIcon size={22} /> },
  { id: "saved",       label: "Збережені",   icon: <HeartIcon size={22} />, requireAuth: true },
  { id: "menu",        label: "Доступність", icon: <AccessIcon size={22} sw={2} /> },
];

export function BottomToolbar({ active }: { active: ToolbarTab }) {
  const router = useRouter();
  const params = useSearchParams();
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
      case "communities":
        router.push("/communities");
        break;
      case "saved":
        router.push("/saved");
        break;
      case "menu": {
        // Open the accessibility drawer via the same `?a11y=1` URL contract
        // that AppHeader/DesktopNav used to set. `Overlays` listens for it.
        const next = new URLSearchParams(params.toString());
        next.set("a11y", "1");
        const path =
          typeof window === "undefined" ? "/" : window.location.pathname;
        router.push(`${path}?${next.toString()}`, { scroll: false });
        break;
      }
    }
  };

  return (
    <nav
      aria-label="Головна навігація"
      className="flex items-stretch rounded-[20px] px-1.5 py-2.5"
      style={{
        // Glassy translucent fill that mirrors the mobile header
        // (linear-gradient using `--color-bg` at ~0.7 alpha) plus a stronger
        // blur and saturate so the map underneath shows through. Both the
        // standard `backdropFilter` and the WebKit prefix are set so Safari
        // and Chromium-based browsers render the same glass effect.
        background: "rgba(250,250,247,0.7)",
        backdropFilter: "blur(14px) saturate(160%)",
        WebkitBackdropFilter: "blur(14px) saturate(160%)",
        boxShadow: "var(--shadow-floating)",
        border: "1px solid rgba(255,255,255,0.55)",
      }}
    >
      {items.map((it) => {
        const on =
          it.id === active ||
          (it.id === "map" && active === "list");
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => handle(it.id)}
            aria-current={on ? "page" : undefined}
            className="flex flex-1 basis-0 flex-col items-center gap-0.5 rounded-xl px-2 py-1"
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
