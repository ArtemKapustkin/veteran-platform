"use client";

import { useEffect } from "react";
import { CloseIcon } from "@/components/icons";
import { LoginCard } from "@/components/login/LoginCard";
import { useLoginPromptStore } from "@/lib/useLoginPrompt";

/**
 * In-app login modal — the only login surface in the app. Opened from
 * `useAuthGuard()` (RSVP / save) or any "Увійти" button via
 * `useLoginPromptStore.getState().open(hint)`.
 *
 * The full SMS / OTP / admin flow runs INSIDE the modal so the user can
 * finish what they were doing without losing page context. On success
 * the modal closes and `SessionBoot` re-fetches the registrations cache
 * (subscribed to `accessToken`).
 *
 * The dialog itself owns:
 *   - Backdrop click + Escape to close.
 *   - Body scroll lock while open.
 *   - The "Щоб …" hint chip shown above the brand header.
 *
 * Everything else (steps, OTP boxes, resend timer, error copy) lives in
 * `LoginCard`.
 */
export function LoginPromptDialog() {
  const isOpen = useLoginPromptStore((s) => s.isOpen);
  const hint = useLoginPromptStore((s) => s.hint);
  const close = useLoginPromptStore((s) => s.close);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={close}
      className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(20,18,15,0.46)" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface relative flex w-full max-w-[420px] flex-col rounded-3xl px-6 pt-7 pb-6"
        style={{
          maxHeight: "calc(100dvh - 48px)",
          overflowY: "auto",
          boxShadow: "0 24px 56px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)",
          animation: "var(--animate-pop-down)",
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Закрити"
          className="text-text2 hover:text-text absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "transparent" }}
        >
          <CloseIcon size={18} />
        </button>

        {hint ? (
          <div
            className="text-text-muted -mt-1 mb-3 self-center rounded-full px-3 py-1"
            style={{
              background: "var(--color-primary-soft)",
              color: "var(--color-primary-ink)",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
            id="login-prompt-title"
          >
            {hint}
          </div>
        ) : (
          <span id="login-prompt-title" className="sr-only">
            Вхід в акаунт
          </span>
        )}

        <LoginCard compact onSuccess={close} />
      </div>
    </div>
  );
}
