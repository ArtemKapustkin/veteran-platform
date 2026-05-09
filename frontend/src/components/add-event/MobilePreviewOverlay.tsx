"use client";

import { useEffect } from "react";
import { BackIcon } from "@/components/icons";
import { EventPagePreview } from "./EventPagePreview";
import type { EventDraft } from "./draft";

/**
 * Full-screen "Превʼю" sheet that slides in from the right over the form.
 * Reuses the global `slide-in-right` keyframes registered in globals.css.
 */
export function MobilePreviewOverlay({
  draft,
  onClose,
}: {
  draft: EventDraft;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Превʼю події"
      className="bg-bg absolute inset-0 z-[80] flex flex-col"
      style={{ animation: "var(--animate-slide-in-right)" }}
    >
      <div
        className="border-border-soft flex items-center justify-between border-b bg-white px-4 py-3"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити превʼю"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F2F1ED]"
        >
          <BackIcon size={20} />
        </button>
        <span
          className="text-text"
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          Превʼю
        </span>
        <span aria-hidden style={{ width: 38 }} />
      </div>
      <div className="flex-1 overflow-auto">
        <EventPagePreview draft={draft} />
      </div>
    </div>
  );
}
