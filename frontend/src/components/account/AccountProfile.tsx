"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/atoms/Avatar";
import { Pill } from "@/components/atoms/Pill";
import { StatBlock } from "@/components/atoms/StatBlock";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { AccessIcon } from "@/components/icons";
import { EVENTS } from "@/data/events";
import { useAuthStore, useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

/**
 * Logged-in account view (S12). Mocked profile + three stats + four
 * sections. RSVP/saved IDs come from the real Zustand store; the rest of
 * the profile (name, avatar, status pill) is stubbed pending real auth.
 */
export function AccountProfile() {
  const router = useRouter();
  const mounted = useMounted();
  const logout = useAuthStore((s) => s.logout);

  const rsvpIds = useEventsStore((s) => s.rsvpIds);
  const savedIds = useEventsStore((s) => s.savedIds);

  const upcoming = mounted
    ? EVENTS.filter((e) => rsvpIds.includes(e.id))
    : [];
  const saved = mounted
    ? EVENTS.filter((e) => savedIds.includes(e.id) && !rsvpIds.includes(e.id))
    : [];
  // Demo "past events" — we don't track attendance history yet, so show a
  // single example so the section isn't empty for first-time users.
  const past = EVENTS.slice(7, 8);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="bg-bg flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[1100px] px-5 pt-8 pb-24 sm:px-8 sm:pt-10 sm:pb-15">
        {/* Profile header */}
        <header className="mb-9 flex flex-wrap items-center gap-4.5">
          <Avatar initial="О" tone="sand" size={72} />
          <div className="min-w-[200px] flex-1">
            <div
              className="text-text"
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              Олег
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              <Pill color="sand">Ветеран · УБД підтверджений</Pill>
              <span className="text-text2" style={{ fontSize: 13 }}>
                Київ · з квітня 2026
              </span>
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
        </div>

        <div className="flex flex-col gap-10">
          <Section
            title="Записаний на події"
            hint="Підтвердив участь — побратими бачать це на карті"
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

          <Section
            title="Уже відвідав"
            hint="Минулі події. Ти був там — і твоє ім’я теж рахувалось"
          >
            {past.map((e) => (
              <EventCardV2 key={e.id} event={{ ...e, distance: "минула" }} />
            ))}
          </Section>

          <AccessibilityCard />
        </div>
      </div>
    </div>
  );
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
