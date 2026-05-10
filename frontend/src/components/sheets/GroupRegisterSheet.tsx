"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { CloseIcon } from "@/components/icons";
import { CompanionInviteRow } from "@/components/shared/CompanionInviteRow";
import type { AppEvent } from "@/data/events";
import { ApiError, type RegistrationCompanion } from "@/lib/api";
import { useEventsStore } from "@/lib/store";
import { toast } from "@/lib/useToast";

// Group-RSVP modal. Two-step flow:
//   1. Pick how many seats (2..4) — the user themselves count as one,
//      so we'll generate `seats - 1` invitation tokens.
//   2. After the backend reserves the group, render a Telegram share
//      button per slot. The recipient claims the seat by opening the
//      link, signing in, and POSTing /api/v1/invitations/{token}/claim.
//
// We deliberately do NOT collect phone numbers — the backend used to
// SMS each companion, but Telegram is the dominant channel for the
// audience and the share-link flow lets the organizer pick the right
// chat / group themselves.

const SEAT_OPTIONS = [2, 3, 4] as const;
type Seats = (typeof SEAT_OPTIONS)[number];

interface GroupRegisterSheetProps {
  event: AppEvent;
  onClose: () => void;
}

export function GroupRegisterSheet({ event, onClose }: GroupRegisterSheetProps) {
  const router = useRouter();
  const setRsvpGroup = useEventsStore((s) => s.setRsvpGroup);
  const setRsvp = useEventsStore((s) => s.setRsvp);
  // If the user already has a pending group registration for this event,
  // skip the reserve step and surface the share links directly. Without
  // this the modal would 409 on a re-open and trap the organizer.
  const existingReg = useEventsStore((s) => s.registrations[event.id]);

  const [seats, setSeats] = useState<Seats>(2);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  // Once the registration is created we move to the "share" step.
  // Holding the registration id + companion tokens here (rather than
  // re-reading the store) so the modal can present a stable list even
  // if the store is reshaped underneath us.
  const [reservation, setReservation] = useState<{
    registrationId: string;
    companions: RegistrationCompanion[];
  } | null>(() => {
    if (
      existingReg &&
      existingReg.status === "pending_companions" &&
      (existingReg.companions?.length ?? 0) > 0 &&
      // Tokens only flow through the "create" response so we can only
      // re-render share buttons if the cached companions still carry
      // them (they always do for organizer-created registrations).
      existingReg.companions!.some((c) => !!c.invite_token)
    ) {
      return {
        registrationId: existingReg.id,
        companions: existingReg.companions ?? [],
      };
    }
    return null;
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  const step: "reserve" | "share" = reservation ? "share" : "reserve";
  const busy = submitting || cancelling;

  // Lock body scroll + Escape-to-close, standard for our dialogs.
  // While the share view is open we still allow Escape so the organizer
  // can dismiss after sharing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, busy]);

  // If the registrations store hydrates AFTER mount (the common case
  // when the modal is opened from a fresh navigation) and surfaces an
  // existing pending group reg with tokens, jump to the share step.
  // Defer to a microtask so we don't trip the
  // `react-hooks/set-state-in-effect` rule (matches the pattern in
  // `useEvent`).
  useEffect(() => {
    if (reservation) return;
    if (!existingReg || existingReg.status !== "pending_companions") return;
    const cs = existingReg.companions ?? [];
    if (cs.length === 0 || !cs.some((c) => !!c.invite_token)) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setReservation({ registrationId: existingReg.id, companions: cs });
    });
    return () => {
      cancelled = true;
    };
  }, [existingReg, reservation]);

  const handleReserve = async () => {
    if (busy) return;
    setSubmitting(true);
    try {
      const reg = await setRsvpGroup(event.id, seats);
      setReservation({
        registrationId: reg.id,
        companions: reg.companions ?? [],
      });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error("Не вдалось забронювати", msg);
    } finally {
      setSubmitting(false);
    }
  };

  // "Cancel reservation" from the share step: drop the group entirely
  // so the seats go back to the quota. We surface this so an organizer
  // who picked too many seats isn't stuck waiting for the TTL to lapse.
  // Reuses `setRsvp(eventId, false)` so the local heart / "Ти йдеш"
  // state stays in sync with what solo cancellation already does.
  const handleCancelReservation = async () => {
    if (!reservation || busy) return;
    setCancelling(true);
    try {
      await setRsvp(event.id, false);
      toast.info("Бронювання скасовано", "Місця знову у загальній квоті.");
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error("Не вдалось скасувати", msg);
    } finally {
      setCancelling(false);
    }
  };

  const handleDone = () => {
    if (!reservation) {
      onClose();
      return;
    }
    onClose();
    // Land the user on the full event page so they see the "Ти йдеш"
    // confirmation card right away (matches solo RSVP behaviour).
    router.push(`/events/${event.id}`);
  };

  return (
    <div
      role="presentation"
      onClick={() => {
        if (!busy) onClose();
      }}
      className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:px-4 sm:py-6"
      style={{ background: "rgba(20,18,15,0.46)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-register-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface relative flex w-full flex-col rounded-t-3xl px-5 pt-6 pb-6 sm:max-w-[460px] sm:rounded-3xl sm:px-6 sm:pt-7"
        style={{
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
          boxShadow: "0 24px 56px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)",
          animation: "var(--animate-pop-down)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Закрити"
          className="text-text2 hover:text-text absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-50"
        >
          <CloseIcon size={18} />
        </button>

        <h2
          id="group-register-title"
          className="text-text m-0 pr-8"
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          {step === "reserve" ? "Запросити побратима" : "Запрошення готові"}
        </h2>
        <p
          className="text-text2 mt-2 mb-0"
          style={{ fontSize: 13.5, lineHeight: 1.5 }}
        >
          {step === "reserve" ? (
            <>
              Бронюємо до 4 місць на «{event.title}». Створимо
              посилання-запрошення — поділись ними у Telegram. У побратимів
              буде 2 години, щоб приєднатись.
            </>
          ) : (
            <>
              Місця заброньовано на «{event.title}». Поділись посиланням з
              кожним побратимом у Telegram. Якщо ніхто не приєднається за 2
              години — місця звільняться автоматично.
            </>
          )}
        </p>

        {step === "reserve" ? (
          <ReserveStep
            seats={seats}
            onSeatsChange={setSeats}
            submitting={submitting}
            onSubmit={handleReserve}
            onCancel={onClose}
          />
        ) : (
          <ShareStep
            event={event}
            companions={reservation!.companions}
            cancelling={cancelling}
            onCancelReservation={handleCancelReservation}
            onDone={handleDone}
          />
        )}
      </div>
    </div>
  );
}

interface ReserveStepProps {
  seats: Seats;
  onSeatsChange: (s: Seats) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function ReserveStep({
  seats,
  onSeatsChange,
  submitting,
  onSubmit,
  onCancel,
}: ReserveStepProps) {
  return (
    <>
      <fieldset className="mt-5 flex flex-col gap-2.5" disabled={submitting}>
        <legend
          className="text-text-muted mb-1.5 block px-0"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Скільки місць
        </legend>
        <div
          role="radiogroup"
          aria-label="Кількість місць"
          className="border-border flex w-full overflow-hidden rounded-[10px] border bg-white"
        >
          {SEAT_OPTIONS.map((n) => {
            const on = seats === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSeatsChange(n)}
                className="flex-1 px-3 py-2.5 transition-colors"
                style={{
                  background: on ? "var(--color-primary)" : "transparent",
                  color: on ? "#fff" : "var(--color-text)",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                }}
              >
                {n} місця
              </button>
            );
          })}
        </div>
        <p className="text-text2 m-0" style={{ fontSize: 12 }}>
          Ти займаєш одне місце; інші — для побратимів.
        </p>
      </fieldset>

      <div className="mt-6 flex flex-col gap-2">
        <Btn
          kind="primary"
          size="lg"
          fullWidth
          loading={submitting}
          onClick={onSubmit}
        >
          Створити запрошення
        </Btn>
        <Btn
          kind="ghost"
          size="md"
          fullWidth
          onClick={onCancel}
          disabled={submitting}
        >
          Скасувати
        </Btn>
      </div>
    </>
  );
}

interface ShareStepProps {
  event: AppEvent;
  companions: RegistrationCompanion[];
  cancelling: boolean;
  onCancelReservation: () => void;
  onDone: () => void;
}

function ShareStep({
  event,
  companions,
  cancelling,
  onCancelReservation,
  onDone,
}: ShareStepProps) {
  // Build the share message once per event — it's a function of the
  // event title only and doesn't depend on which slot we're sharing.
  // Line breaks are deliberate: greeting + invite on separate lines,
  // a blank line for breathing room, then the call-to-action right
  // before the URL the row will append on its own line.
  const inviteText = useMemo(
    () =>
      `Привіт!\nЗапрошую тебе на «${event.title}».\n\nНатисни посилання, щоб приєднатись до групи — місце для тебе вже заброньовано:`,
    [event.title],
  );

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div
        className="text-text-muted block"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Посилання-запрошення
      </div>

      {companions.length === 0 ? (
        <p className="text-text2 m-0" style={{ fontSize: 13 }}>
          Запрошення не створено.
        </p>
      ) : (
        companions.map((c, i) => (
          <CompanionInviteRow
            key={c.id}
            index={i + 1}
            companion={c}
            inviteText={inviteText}
          />
        ))
      )}

      <div className="mt-3 flex flex-col gap-2">
        <Btn kind="primary" size="lg" fullWidth onClick={onDone}>
          Готово
        </Btn>
        <Btn
          kind="ghost"
          size="md"
          fullWidth
          loading={cancelling}
          onClick={onCancelReservation}
        >
          Скасувати бронювання
        </Btn>
      </div>
    </div>
  );
}

