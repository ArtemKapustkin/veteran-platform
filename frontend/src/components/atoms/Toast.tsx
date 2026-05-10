"use client";

import { CheckIcon, CloseIcon } from "@/components/icons";
import { useToastStore, type ToastKind } from "@/lib/useToast";

// Single-toast surface. Pinned to the bottom of the viewport on mobile
// (above the bottom nav) and to the bottom-right on wider screens so it
// doesn't cover the action the user just took.

const KIND_STYLE: Record<ToastKind, { bg: string; fg: string; border: string; iconBg: string }> = {
  success: {
    bg: "#0E6E45",
    fg: "#FFFFFF",
    border: "#0B5A39",
    iconBg: "rgba(255,255,255,0.18)",
  },
  error: {
    bg: "#7A2727",
    fg: "#FFFFFF",
    border: "#601C1C",
    iconBg: "rgba(255,255,255,0.18)",
  },
  info: {
    bg: "#1F2937",
    fg: "#FFFFFF",
    border: "#111827",
    iconBg: "rgba(255,255,255,0.16)",
  },
};

export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!current) return null;
  const palette = KIND_STYLE[current.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[100] flex justify-center px-4 lg:left-auto lg:right-6 lg:justify-end"
      style={{
        // Sit above the mobile bottom toolbar (which lives at bottom: 24px
        // with a 56px ish height); 96px clears it comfortably. On desktop
        // we don't have a bottom bar so 32px is plenty.
        bottom: "max(env(safe-area-inset-bottom), 96px)",
      }}
    >
      <div
        className="pointer-events-auto flex max-w-[420px] items-start gap-3 rounded-2xl px-3.5 py-3 shadow-md"
        style={{
          background: palette.bg,
          color: palette.fg,
          border: `1px solid ${palette.border}`,
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          animation: "var(--animate-toast-in, toast-in 180ms cubic-bezier(0.4,0,0.2,1))",
        }}
      >
        <span
          aria-hidden
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: palette.iconBg }}
        >
          <CheckIcon size={15} stroke={palette.fg} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span>{current.message}</span>
          {current.hint ? (
            <span style={{ opacity: 0.78, fontSize: 13, fontWeight: 400 }}>
              {current.hint}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dismiss()}
          aria-label="Закрити сповіщення"
          className="ml-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ color: palette.fg, opacity: 0.85 }}
        >
          <CloseIcon size={15} stroke={palette.fg} />
        </button>
      </div>
    </div>
  );
}
