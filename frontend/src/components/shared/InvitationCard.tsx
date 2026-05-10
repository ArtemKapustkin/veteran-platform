"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { CalIcon, ClockIcon, UserIcon } from "@/components/icons";
import { ApiError, type Invitation } from "@/lib/api";
import { useInvitationsStore } from "@/lib/useInvitations";
import { toast } from "@/lib/useToast";

// Single pending invitation card. Lives in the account "Запрошення"
// section. Two-step decline matches CancelRsvpAction so an accidental
// tap doesn't drop the whole group registration server-side (decline
// cancels the entire group, not just this seat).

interface InvitationCardProps {
  invitation: Invitation;
  /** When true, navigate to /events/:id after accepting (default true). */
  routeOnAccept?: boolean;
}

export function InvitationCard({
  invitation,
  routeOnAccept = true,
}: InvitationCardProps) {
  const router = useRouter();
  const confirm = useInvitationsStore((s) => s.confirm);
  const decline = useInvitationsStore((s) => s.decline);
  const refresh = useInvitationsStore((s) => s.refresh);

  const [accepting, setAccepting] = useState(false);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const [declining, setDeclining] = useState(false);

  const inviter =
    invitation.invited_by_fullname?.trim() || invitation.invited_by_phone;

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await confirm(invitation.id);
      toast.success("Підтверджено", "Ти у групі. Зустрінемось на події.");
      if (routeOnAccept && invitation.event?.id) {
        router.push(`/events/${invitation.event.id}`);
      }
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

  const expiresLabel = useExpiresIn(invitation.reservation_expires_at);

  return (
    <div
      className="border-border-soft flex flex-col gap-3 rounded-2xl border bg-white p-4"
      style={{ animation: "var(--animate-pop-down)" }}
    >
      <div className="flex flex-col gap-1.5">
        <div
          className="text-text-muted inline-flex items-center gap-1.5"
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <UserIcon size={12} />
          {inviter} запросив(ла) тебе
        </div>
        <div
          className="text-text"
          style={{
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
          }}
        >
          {invitation.event?.title ?? "Подія"}
        </div>
        <div
          className="text-text2 flex flex-wrap items-center"
          style={{ rowGap: 4, columnGap: 12, fontSize: 12.5 }}
        >
          {invitation.event?.starts_at ? (
            <span className="flex items-center gap-1.5">
              <CalIcon size={13} />
              {formatStarts(invitation.event.starts_at)}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <UserIcon size={13} />
            {invitation.seats_in_group} місця
          </span>
          {expiresLabel ? (
            <span className="flex items-center gap-1.5">
              <ClockIcon size={13} />
              {expiresLabel}
            </span>
          ) : null}
        </div>
      </div>

      {confirmingDecline ? (
        <div
          className="border-border-soft -mx-1 mt-1 flex flex-col gap-2 rounded-xl border bg-[#FFF7F0] px-3 py-2.5"
          style={{ animation: "var(--animate-pop-down)" }}
        >
          <span className="text-text" style={{ fontSize: 13, fontWeight: 500 }}>
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
            size="md"
            loading={accepting}
            onClick={handleAccept}
            className="flex-1"
          >
            Прийняти
          </Btn>
          <Btn
            kind="ghost"
            size="md"
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

// Surface common backend rejections in a way the user can react to.
// 409 nearly always means the invitation lapsed or was already handled —
// we re-fetch so the UI drops the stale row instead of leaving a button
// that keeps failing.
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

const DOW = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const MONTH_ABBR = [
  "січ", "лют", "бер", "квіт", "трав", "черв",
  "лип", "сер", "вер", "жовт", "лист", "груд",
] as const;

function formatStarts(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]} · ${hh}:${mm}`;
}

// Live "Залишилось 8 год / 23 хв" countdown. Updates once a minute —
// good enough for a 24h TTL and avoids re-rendering the card every
// second. Falls back to absolute time when more than a day is left
// (shouldn't happen in practice — backend caps at 24h).
function useExpiresIn(iso: string): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return "";
  const diff = target - now;
  if (diff <= 0) return "Прострочено";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `Залишилось ${mins} хв`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Залишилось ${hours} год`;
  const days = Math.round(hours / 24);
  return `Залишилось ${days} дн`;
}
