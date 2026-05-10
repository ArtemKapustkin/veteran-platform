"use client";

import { useState } from "react";

import { Btn } from "@/components/atoms/Btn";
import { ClockIcon } from "@/components/icons";
import { logout } from "@/lib/store";

interface Props {
  /** Switch back to the upload step so the user can try other documents. */
  onRetry: () => void;
  /** Called after the session is cleared so the wizard returns to "phone". */
  onLogout: () => void;
}

// End-state shown when the AI couldn't auto-approve the document. The
// veteran can't enter the app from here — an admin has to flip the
// status to `approved` via the back-office. We let them either re-try
// with different documents or sign out.
export function PendingReviewStep({ onRetry, onLogout }: Props) {
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      setSigningOut(false);
      onLogout();
    }
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mt-3 mb-4 flex justify-center">
        <div
          className="flex items-center justify-center rounded-[20px] text-white"
          style={{
            height: 64,
            width: 64,
            background:
              "linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-ink) 100%)",
            boxShadow: "0 8px 24px rgba(31,77,52,0.22)",
          }}
        >
          <ClockIcon size={30} stroke="currentColor" sw={1.8} />
        </div>
      </div>

      <h1
        className="text-text m-0"
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
        }}
      >
        Документи на перевірці
      </h1>
      <p
        className="text-text2 mx-0 mb-6 mt-2.5"
        style={{ fontSize: 15, lineHeight: 1.5 }}
      >
        Адміністратор перевірить документи вручну та підтвердить твій
        статус. Ми сповістимо тебе у SMS, коли все буде готово.
      </p>

      <div className="flex w-full flex-col gap-2.5">
        <Btn kind="secondary" size="lg" fullWidth onClick={onRetry}>
          Завантажити інші документи
        </Btn>
        <Btn
          kind="ghost"
          size="lg"
          fullWidth
          onClick={handleLogout}
          loading={signingOut}
          disabled={signingOut}
        >
          Вийти
        </Btn>
      </div>
    </div>
  );
}
