"use client";

import { useEffect, useMemo, useState } from "react";
import { ClockIcon } from "@/components/icons";
import type { AppEvent } from "@/data/events";
import { useAuthStore, useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { CompanionInviteRow } from "./CompanionInviteRow";

// Organizer-only summary card shown on the event detail screen below
// the "Ти йдеш" pill. Surfaces the per-companion claim status + a
// share button per pending slot so the organizer doesn't have to
// reopen the GroupRegisterSheet to re-share a link.
//
// Renders nothing for:
//   - guests / unauthed callers
//   - non-organizers (recipients see "Ти йдеш" but no panel)
//   - solo registrations (no companions) and reservations the
//     `pending_companions` expirer has already torn down

interface OrganizerInvitesPanelProps {
  event: AppEvent;
}

export function OrganizerInvitesPanel({ event }: OrganizerInvitesPanelProps) {
  const mounted = useMounted();
  const myVeteranId = useAuthStore((s) => s.veteran?.id);
  const reg = useEventsStore((s) => s.registrations[event.id]);

  const inviteText = useMemo(
    () =>
      `Привіт! Запрошую тебе на «${event.title}». Натисни посилання, щоб приєднатись до групи — місце для тебе вже заброньовано:`,
    [event.title],
  );

  if (!mounted) return null;
  if (!reg || !myVeteranId) return null;
  // Only the organizer sees this — companions get a different
  // (simpler) confirmation. The backend redacts invite_tokens for
  // non-organizers anyway, so the share buttons would be unusable.
  if (reg.veteran_id !== myVeteranId) return null;
  const companions = reg.companions ?? [];
  if (companions.length === 0) return null;

  const pending = companions.filter((c) => c.status === "pending").length;
  const accepted = companions.filter((c) => c.status === "confirmed").length;

  return (
    <div
      className="border-border-soft flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3.5"
      style={{ animation: "var(--animate-pop-down)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-text"
            style={{
              fontSize: 14.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
            }}
          >
            Твої запрошення
          </span>
          <span className="text-text2" style={{ fontSize: 12.5 }}>
            {accepted} {plurAccepted(accepted)}, {pending} {plurPending(pending)}
          </span>
        </div>
        {pending > 0 && reg.reservation_expires_at ? (
          <ExpiresBadge iso={reg.reservation_expires_at} />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {companions.map((c, i) => (
          <CompanionInviteRow
            key={c.id}
            index={i + 1}
            companion={c}
            inviteText={inviteText}
          />
        ))}
      </div>
    </div>
  );
}

function ExpiresBadge({ iso }: { iso: string }) {
  const label = useExpiresIn(iso);
  if (!label) return null;
  return (
    <span
      className="inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5"
      style={{ background: "#FFF4E2", color: "#7A4A0A", fontSize: 11.5, fontWeight: 600 }}
    >
      <ClockIcon size={12} />
      {label}
    </span>
  );
}

// Mirrors the helper in `InvitationLandingScreen` — keeping it inline
// here so the event-detail surface doesn't have to import from
// `app/`. With a 2h TTL we'd rather show a minute-precision countdown
// than the hours-only label so an organizer can tell when the
// reservation is about to elapse.
function useExpiresIn(iso: string): string {
  const target = useMemo(() => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : t;
  }, [iso]);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setNow(Date.now());
    });
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  if (target == null || now == null) return "";
  const diff = target - now;
  if (diff <= 0) return "Прострочено";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} хв`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hours} год`;
  return `${hours} год ${remMins} хв`;
}

function plurAccepted(n: number): string {
  if (n === 1) return "прийняв";
  return "прийняли";
}

function plurPending(n: number): string {
  if (n === 1) return "очікує";
  return "очікують";
}
