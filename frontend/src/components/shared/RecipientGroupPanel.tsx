"use client";

import { CheckIcon, ClockIcon, UserIcon } from "@/components/icons";
import type { AppEvent } from "@/data/events";
import { useAuthStore, useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

// Mirror of `OrganizerInvitesPanel` for the recipient side: shows
// the group composition (organizer + confirmed companions + count of
// still-pending slots) so a buddy who claimed an invitation can see
// who else is going. No share buttons — recipients can't re-share
// (and the backend redacts every other companion's invite_token
// before responding to them).
//
// Renders nothing for the organizer — they get the richer
// `OrganizerInvitesPanel` instead.

interface RecipientGroupPanelProps {
  event: AppEvent;
}

export function RecipientGroupPanel({ event }: RecipientGroupPanelProps) {
  const mounted = useMounted();
  const myVeteranId = useAuthStore((s) => s.veteran?.id);
  const reg = useEventsStore((s) => s.registrations[event.id]);

  if (!mounted) return null;
  if (!reg || !myVeteranId) return null;
  // Organizer sees their own panel. Solo registrations have no group
  // to render — bail.
  if (reg.veteran_id === myVeteranId) return null;
  if (reg.seats <= 1) return null;

  const companions = reg.companions ?? [];
  const confirmed = companions.filter((c) => c.status === "confirmed");
  const pending = companions.filter((c) => c.status === "pending").length;

  // Build the row list: organizer first, then everyone else who
  // confirmed (excluding the viewer — they get a "Ти" row labelled
  // explicitly so it stands out).
  const otherConfirmed = confirmed.filter(
    (c) => c.veteran_id && c.veteran_id !== myVeteranId,
  );
  const organizerName = reg.organizer_fullname?.trim() || "Організатор";

  return (
    <div
      className="border-border-soft flex flex-col gap-2.5 rounded-2xl border bg-white px-4 py-3.5"
      style={{ animation: "var(--animate-pop-down)" }}
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-text"
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Твоя група
        </span>
        <span className="text-text2" style={{ fontSize: 12.5 }}>
          Запросив(ла) {organizerName}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <PersonRow icon="user" label={organizerName} hint="Організатор" />
        <PersonRow icon="check" label="Ти" hint="Прийнято" tone="success" />
        {otherConfirmed.map((c) => (
          <PersonRow
            key={c.id}
            icon="check"
            label={c.fullname?.trim() || "Побратим"}
            hint="Прийнято"
            tone="success"
          />
        ))}
        {pending > 0 ? (
          <PersonRow
            icon="clock"
            label={
              pending === 1
                ? "Ще 1 побратим думає"
                : `Ще ${pending} побратимів думають`
            }
            hint="Очікуємо"
            tone="muted"
          />
        ) : null}
      </div>
    </div>
  );
}

interface PersonRowProps {
  icon: "user" | "check" | "clock";
  label: string;
  hint: string;
  tone?: "default" | "success" | "muted";
}

function PersonRow({ icon, label, hint, tone = "default" }: PersonRowProps) {
  const palette =
    tone === "success"
      ? { iconBg: "#0E6E45", iconFg: "#fff", hint: "#0E6E45" }
      : tone === "muted"
        ? { iconBg: "#E8E5DE", iconFg: "#7A6A50", hint: "#7A4A0A" }
        : { iconBg: "#F0EBE0", iconFg: "#3A352D", hint: "var(--color-text2)" };
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: palette.iconBg, color: palette.iconFg }}
      >
        {icon === "user" ? (
          <UserIcon size={14} stroke={palette.iconFg} />
        ) : icon === "check" ? (
          <CheckIcon size={14} stroke={palette.iconFg} />
        ) : (
          <ClockIcon size={14} stroke={palette.iconFg} />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="text-text truncate"
          style={{ fontSize: 13.5, fontWeight: 500 }}
        >
          {label}
        </span>
        <span style={{ color: palette.hint, fontSize: 11.5, fontWeight: 600 }}>
          {hint}
        </span>
      </div>
    </div>
  );
}
