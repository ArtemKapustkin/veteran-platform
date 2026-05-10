"use client";

import { useEffect, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { ClockIcon, UserIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { useEventsStore } from "@/lib/store";
import { useInvitationsStore } from "@/lib/useInvitations";
import { useMounted } from "@/lib/useMounted";
import { toast } from "@/lib/useToast";

// Inline callout shown on the event detail screen when the current user
// has a pending invitation for this event. Renders nothing once the
// user has accepted (the existing "Ти йдеш" card already covers that
// state) or when there's no pending invitation for the event.
//
// Two-step decline because decline cancels the whole group server-side.

interface InvitationBannerProps {
  eventId: string;
  /** Visual variant. `compact` is used inside the desktop sticky card. */
  variant?: "default" | "compact";
}

export function InvitationBanner({
  eventId,
  variant = "default",
}: InvitationBannerProps) {
  const mounted = useMounted();
  const invitation = useInvitationsStore((s) => s.getForEvent(eventId));
  const isRsvp = useEventsStore((s) => s.rsvpIds.includes(eventId));
  const confirm = useInvitationsStore((s) => s.confirm);
  const decline = useInvitationsStore((s) => s.decline);
  const refresh = useInvitationsStore((s) => s.refresh);

  const [accepting, setAccepting] = useState(false);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [declining, setDeclining] = useState(false);

  const expiresLabel = useExpiresIn(invitation?.reservation_expires_at);

  // Avoid SSR/CSR drift; the invitations store is only populated client-side.
  if (!mounted || !invitation || isRsvp) return null;

  const inviter =
    invitation.invited_by_fullname?.trim() || invitation.invited_by_phone;

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await confirm(invitation.id);
      toast.success("Підтверджено", "Ти у групі.");
    } catch (e) {
      handleApiError(e, refresh);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (declining) return;
    setDeclining(true);
    try {
      await decline(invitation.id);
      toast.info("Запрошення відхилено");
    } catch (e) {
      handleApiError(e, refresh);
    } finally {
      setDeclining(false);
      setConfirmingDecline(false);
    }
  };

  const compact = variant === "compact";

  return (
    <div
      className="flex flex-col gap-2.5 rounded-2xl px-3.5 py-3"
      style={{
        background: "#FFF4E2",
        border: "1px solid #F0D7A6",
        animation: "var(--animate-pop-down)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "#E5A93A", color: "#fff" }}
        >
          <UserIcon size={15} stroke="#fff" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            style={{
              color: "#7A4A0A",
              fontSize: compact ? 13.5 : 14.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            {inviter} запросив(ла) тебе
          </span>
          <span
            className="text-text2 flex flex-wrap items-center"
            style={{ rowGap: 2, columnGap: 10, fontSize: 12.5 }}
          >
            <span>{invitation.seats_in_group} місця у групі</span>
            {expiresLabel ? (
              <span className="flex items-center gap-1">
                <ClockIcon size={12} />
                {expiresLabel}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {confirmingDecline ? (
        <div className="flex flex-col gap-2">
          <span
            className="text-text"
            style={{ fontSize: 12.5, fontWeight: 500 }}
          >
            Якщо відхилиш — група розпускається, місця звільняться.
          </span>
          <div className="flex flex-wrap gap-2">
            <Btn
              kind="secondary"
              size="sm"
              loading={declining}
              onClick={handleDecline}
            >
              Так, відхилити
            </Btn>
            <Btn
              kind="ghost"
              size="sm"
              disabled={declining}
              onClick={() => setConfirmingDecline(false)}
            >
              Передумав
            </Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Btn
            kind="primary"
            size={compact ? "sm" : "md"}
            loading={accepting}
            onClick={handleAccept}
            className="flex-1"
          >
            Прийняти
          </Btn>
          <Btn
            kind="ghost"
            size={compact ? "sm" : "md"}
            disabled={accepting}
            onClick={() => setConfirmingDecline(true)}
          >
            Відхилити
          </Btn>
        </div>
      )}
    </div>
  );
}

function handleApiError(e: unknown, refresh: () => Promise<void>) {
  if (e instanceof ApiError) {
    if (e.status === 409) {
      toast.error("Запрошення вже неактивне", e.message);
      void refresh();
      return;
    }
    if (e.status === 403) {
      toast.error("Немає доступу", e.message);
      return;
    }
    toast.error("Не вдалось обробити", e.message);
    return;
  }
  toast.error("Не вдалось обробити", (e as Error).message);
}

// Identical to the helper in InvitationCard, kept local to avoid
// pulling a half-built shared "expires-in" util just for two callers.
function useExpiresIn(iso?: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [iso]);
  if (!iso) return "";
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "";
  const diff = target - now;
  if (diff <= 0) return "Прострочено";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} хв`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} год`;
  const days = Math.round(hours / 24);
  return `${days} дн`;
}
