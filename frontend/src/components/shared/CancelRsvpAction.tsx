"use client";

import { useState } from "react";
import { Btn } from "@/components/atoms/Btn";

/**
 * Two-step "I can't make it" control. First tap reveals an inline
 * confirmation row so a stray finger doesn't quietly drop the user out
 * of an event they wanted to attend. Second tap fires `onConfirm` with a
 * loading spinner until the parent's async cancel resolves.
 *
 * `align` controls horizontal alignment of the trigger ("center" for the
 * mobile bottom bar, "start" for the desktop sticky card).
 */
export function CancelRsvpAction({
  onConfirm,
  align = "center",
}: {
  onConfirm: () => Promise<void> | void;
  align?: "center" | "start";
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-text2 hover:text-text rounded-md px-2 py-1 transition-colors"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          alignSelf: align === "center" ? "center" : "flex-start",
        }}
      >
        Не зможу прийти
      </button>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      style={{
        justifyContent: align === "center" ? "center" : "flex-start",
        animation: "var(--animate-pop-down)",
      }}
    >
      <span
        className="text-text2"
        style={{ fontSize: 12.5, fontWeight: 500 }}
      >
        Точно скасувати участь?
      </span>
      <Btn
        kind="secondary"
        size="sm"
        loading={pending}
        onClick={async () => {
          try {
            setPending(true);
            await onConfirm();
          } finally {
            setPending(false);
            setConfirming(false);
          }
        }}
        className="!h-8 !text-[12.5px]"
      >
        Так, скасувати
      </Btn>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-text2 hover:text-text rounded-md px-2 py-1 transition-colors disabled:opacity-50"
        style={{ fontSize: 12.5, fontWeight: 500 }}
      >
        Ні, лишаюсь
      </button>
    </div>
  );
}
