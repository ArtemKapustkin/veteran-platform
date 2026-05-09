"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/icons";

/**
 * Floating "+" button that lives bottom-right on mobile screens that need
 * a fast path into /add-event (S03 map view, S06 list view). Sits above the
 * BottomToolbar so it never overlaps the tabs.
 */
export function AddEventFab() {
  return (
    <Link
      href="/add-event"
      aria-label="Додати подію"
      className="bg-primary absolute right-4.5 z-10 flex h-14 w-14 items-center justify-center rounded-full text-white"
      style={{
        bottom: 104,
        boxShadow:
          "0 8px 22px rgba(31,77,52,0.32), 0 1px 2px rgba(31,77,52,0.18)",
      }}
    >
      <PlusIcon size={26} sw={2.4} />
    </Link>
  );
}
