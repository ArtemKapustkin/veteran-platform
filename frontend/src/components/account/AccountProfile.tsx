"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { Pill } from "@/components/atoms/Pill";
import { StatBlock } from "@/components/atoms/StatBlock";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { InvitationCard } from "@/components/shared/InvitationCard";
import { AccessIcon } from "@/components/icons";
import { useEvents } from "@/lib/useEvents";
import {
  logoutCurrentUser,
  useAuthStore,
  useEventsStore,
} from "@/lib/store";
import { useInvitationsStore } from "@/lib/useInvitations";
import { useMounted } from "@/lib/useMounted";

/**
 * Logged-in account view (S12). Profile data comes from the persisted
 * `/me` payload in the auth store; the upcoming/saved sections filter
 * the live events list against the user's registrations and bookmarks.
 */
export function AccountProfile() {
  const router = useRouter();
  const mounted = useMounted();
  const veteran = useAuthStore((s) => s.veteran);
  const role = useAuthStore((s) => s.role);

  const rsvpIds = useEventsStore((s) => s.rsvpIds);
  const savedIds = useEventsStore((s) => s.savedIds);
  const invitations = useInvitationsStore((s) => s.items);

  const { events } = useEvents();

  const pendingInvitations = mounted
    ? invitations.filter((i) => i.status === "pending")
    : [];

  const upcoming = mounted
    ? events.filter((e) => rsvpIds.includes(e.id))
    : [];
  const saved = mounted
    ? events.filter((e) => savedIds.includes(e.id) && !rsvpIds.includes(e.id))
    : [];
  // Past events aren't tracked yet — keep the section empty rather than
  // showing a fake row so the count is honest.
  const past: typeof events = [];

  const handleLogout = async () => {
    await logoutCurrentUser();
    router.push("/");
  };

  const displayName =
    veteran?.fullname?.trim() ||
    (role === "admin" ? "Адмін" : "Ветеран");
  const initial = displayName.charAt(0).toUpperCase() || "С";

  const cityLabel = veteran?.city ? `${veteran.city} · ` : "";
  const joinedLabel = veteran?.created_at
    ? `з ${formatJoined(veteran.created_at)}`
    : "";

  const statusLabel =
    role === "admin"
      ? "Адміністратор"
      : veteran?.verified
        ? "Ветеран · УБД підтверджений"
        : veteran?.verification_status === "processing"
          ? "Документи на перевірці"
          : "Ветеран · непідтверджений";

  return (
    <div className="bg-bg flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1100px] px-5 pt-8 pb-24 sm:px-8 sm:pt-10 sm:pb-15">
        {/* Profile header */}
        <header className="mb-9 flex flex-wrap items-center gap-4.5">
          <Avatar initial={initial} tone="sand" size={72} />
          <div className="min-w-[200px] flex-1">
            <div
              className="text-text"
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              {displayName}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <Pill color="sand">{statusLabel}</Pill>
              {(cityLabel || joinedLabel) && (
                <span className="text-text2" style={{ fontSize: 13 }}>
                  {cityLabel}
                  {joinedLabel}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="border-border text-text2 rounded-[10px] border bg-transparent px-4 py-2.5 hover:bg-black/5"
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            Вийти
          </button>
        </header>

        {/* Stats strip */}
        <div
          className="mb-10 grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          }}
        >
          <StatBlock value={upcoming.length} label="Записаний на" />
          <StatBlock value={past.length} label="Уже відвідав" />
          <StatBlock value={saved.length} label="Збережено" />
          {pendingInvitations.length > 0 ? (
            <StatBlock value={pendingInvitations.length} label="Запрошень" />
          ) : null}
        </div>

        <div className="flex flex-col gap-10">
          {pendingInvitations.length > 0 ? (
            <Section
              title="Запрошення"
              hint="Тебе кличуть у груповий запис — підтверди або відхили"
            >
              {pendingInvitations.map((inv) => (
                <InvitationCard key={inv.id} invitation={inv} />
              ))}
            </Section>
          ) : null}

          <Section
            title="Записаний на події"
            hint="Підтверджена участь"
          >
            {upcoming.length > 0 ? (
              upcoming.map((e) => <EventCardV2 key={e.id} event={e} />)
            ) : (
              <EmptyHint>
                Поки що нічого. Натисни «Іду» на події — і вона з’явиться тут.
              </EmptyHint>
            )}
          </Section>

          <Section
            title="Збережені"
            hint="Події, які ти позначив серцем — вирішиш пізніше"
            action={
              <Link
                href="/saved"
                className="text-text rounded-lg px-2.5 py-1.5 hover:bg-black/5"
                style={{ fontSize: 13, fontWeight: 500 }}
              >
                Усі →
              </Link>
            }
          >
            {saved.length > 0 ? (
              saved.map((e) => <EventCardV2 key={e.id} event={e} />)
            ) : (
              <EmptyHint>Збережених поки немає.</EmptyHint>
            )}
          </Section>

          {past.length > 0 ? (
            <Section
              title="Уже відвідав"
              hint="Минулі події. Ти був там — і твоє ім’я теж рахувалось"
            >
              {past.map((e) => (
                <EventCardV2 key={e.id} event={{ ...e, distance: "минула" }} />
              ))}
            </Section>
          ) : null}

          <AccessibilityCard />
        </div>
      </div>
    </div>
  );
}

const MONTHS_GENITIVE = [
  "січня", "лютого", "березня", "квітня", "травня", "червня",
  "липня", "серпня", "вересня", "жовтня", "листопада", "грудня",
] as const;

function formatJoined(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className="text-text"
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {hint ? (
            <div className="text-text2 mt-0.5" style={{ fontSize: 12 }}>
              {hint}
            </div>
          ) : null}
        </div>
        {action}
      </div>
      <div
        className="grid gap-3.5"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gridAutoRows: "min-content",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-border-soft text-text2 rounded-2xl border bg-white px-4.5 py-5"
      style={{ fontSize: 13, lineHeight: 1.5 }}
    >
      {children}
    </div>
  );
}

function AccessibilityCard() {
  const router = useRouter();
  const onAccess = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("a11y", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };
  return (
    <div
      className="border-primary bg-primary-soft flex items-start gap-4 rounded-2xl border-2 px-5 py-5"
    >
      <div
        aria-hidden
        className="bg-primary text-white flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
      >
        <AccessIcon size={22} sw={2} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className="text-primary-ink"
          style={{
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Доступність та інклюзивність
        </div>
        <div className="text-text2" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Розмір тексту, контраст, голосовий ввід — підлаштуй під себе.
        </div>
        <button
          type="button"
          onClick={onAccess}
          className="bg-primary mt-3 inline-flex h-10 items-center gap-2 self-start rounded-[10px] px-4 text-white shadow-[0_1px_2px_rgba(31,77,52,0.22)] hover:brightness-[1.04] active:brightness-95"
          style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}
        >
          <AccessIcon size={16} sw={2} stroke="#fff" />
          Налаштувати
        </button>
      </div>
    </div>
  );
}
