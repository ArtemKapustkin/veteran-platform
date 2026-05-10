"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { CheckIcon, CloseIcon, ShareIcon, TgIcon } from "@/components/icons";
import type { AppEvent } from "@/data/events";
import { ApiError, eventsApi, type RegistrationCompanion } from "@/lib/api";
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
  } | null>(null);
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
  // who picked too many seats isn't stuck waiting 24h for the TTL.
  const handleCancelReservation = async () => {
    if (!reservation || busy) return;
    setCancelling(true);
    try {
      await eventsApi.cancelRegistration(event.id, reservation.registrationId);
      // Mirror what useEventsStore.setRsvp(false) does — drop the local
      // RSVP entry so the heart / "Ти йдеш" cards reset immediately.
      useEventsStore.setState((s) => {
        const next = { ...s.registrations };
        delete next[event.id];
        return {
          rsvpIds: s.rsvpIds.filter((x) => x !== event.id),
          registrations: next,
        };
      });
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
              буде 24 години, щоб приєднатись.
            </>
          ) : (
            <>
              Місця заброньовано на «{event.title}». Поділись посиланням з
              кожним побратимом у Telegram. Якщо ніхто не приєднається за 24
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
  const shareText = useMemo(
    () =>
      `Привіт! Запрошую тебе на «${event.title}». Натисни посилання, щоб приєднатись до групи — місце для тебе вже заброньовано:`,
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
          <CompanionShareRow
            key={c.id}
            index={i + 1}
            companion={c}
            shareText={shareText}
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

interface CompanionShareRowProps {
  index: number;
  companion: RegistrationCompanion;
  shareText: string;
}

function CompanionShareRow({
  index,
  companion,
  shareText,
}: CompanionShareRowProps) {
  const [copied, setCopied] = useState(false);

  // Build the absolute URL on the client so we don't need the backend
  // to know about the SPA origin (mobile preview, dev tunnels, etc.).
  // SSR would render an empty string; we only use this in event
  // handlers / labels rendered client-side.
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !companion.invite_token) return "";
    return `${window.location.origin}/invitations/${encodeURIComponent(companion.invite_token)}`;
  }, [companion.invite_token]);

  const tgHref = useMemo(() => {
    if (!shareUrl) return "";
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(shareText);
    return `https://t.me/share/url?url=${u}&text=${t}`;
  }, [shareUrl, shareText]);

  const claimed = companion.status === "confirmed";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Не вдалось скопіювати", "Спробуй вручну з адресного рядка.");
    }
  };

  return (
    <div className="border-border-soft flex flex-col gap-2 rounded-[10px] border bg-white px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text2" style={{ fontSize: 12.5, fontWeight: 500 }}>
          Побратим #{index}
        </span>
        {claimed ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background: "#E8F6EF",
              color: "#0E6E45",
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            <CheckIcon size={12} />
            Прийнято
          </span>
        ) : null}
      </div>

      <div
        className="text-text2 truncate rounded-[8px] bg-[var(--color-bg)] px-2.5 py-1.5"
        style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
        title={shareUrl}
      >
        {shareUrl || "—"}
      </div>

      {claimed ? null : (
        <div className="flex flex-wrap gap-2">
          <Btn
            kind="tg"
            size="sm"
            icon={<TgIcon size={15} />}
            asLink
            className="flex-1"
            onClick={() => {
              if (!tgHref) return;
              window.open(tgHref, "_blank", "noopener,noreferrer");
            }}
          >
            Поділитись у Telegram
          </Btn>
          <Btn
            kind="secondary"
            size="sm"
            icon={<ShareIcon size={15} />}
            onClick={handleCopy}
          >
            {copied ? "Скопійовано" : "Копіювати"}
          </Btn>
        </div>
      )}
    </div>
  );
}
