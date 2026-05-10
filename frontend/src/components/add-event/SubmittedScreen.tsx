"use client";

import Link from "next/link";
import { Btn } from "@/components/atoms/Btn";
import { CalIcon, CheckIcon, PinIcon, PlusIcon } from "@/components/icons";
import { DesktopNav } from "@/components/desktop/DesktopNav";
import { Overlays } from "@/components/sheets/Overlays";
import { useIsDesktop } from "@/lib/useIsDesktop";
import type { EventDraft } from "./draft";

function placesLabel(quota: number): string {
  if (quota === 1) return "місце";
  if (quota < 5) return "місця";
  return "місць";
}

/**
 * S11 — success screen rendered after the organizer hits "Опублікувати".
 *
 * The same centered card composition is used on mobile and desktop;
 * desktop additionally renders the top nav above it. `onRestart` resets
 * the form back to step 1 with an empty draft.
 */
export function SubmittedScreen({
  draft,
  onRestart,
}: {
  draft: EventDraft;
  onRestart: () => void;
}) {
  const isDesktop = useIsDesktop();
  const title = draft.title || "Назва події";
  const dateLine = [draft.date, draft.time].filter(Boolean).join(" · ") || "—";
  const quota = parseInt(draft.quota, 10);
  const quotaShown = Number.isNaN(quota) ? 0 : quota;

  const card = (
    <main
      className="bg-bg flex w-full flex-col items-center px-6 py-10"
      style={{ minHeight: isDesktop ? 0 : "100dvh", flex: isDesktop ? 1 : undefined }}
    >
      <div className="flex w-full flex-1 flex-col items-center justify-center text-center" style={{ maxWidth: 520 }}>
        <div
          aria-hidden
          className="mb-6 flex items-center justify-center rounded-full"
          style={{
            width: 88,
            height: 88,
            background: "var(--color-primary-soft)",
            color: "var(--color-primary)",
            boxShadow: "0 0 0 8px rgba(91,140,94,0.08)",
          }}
        >
          <CheckIcon size={42} sw={2.4} />
        </div>

        <h1
          className="text-text m-0"
          style={{
            fontSize: 32,
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
          }}
        >
          Подію створено
        </h1>
        <p
          className="text-text2 m-0 mt-3.5"
          style={{
            fontSize: 16,
            lineHeight: 1.5,
            letterSpacing: "-0.005em",
            maxWidth: 420,
          }}
        >
          Чекає на модерацію — це 1-2 робочих дні. Щойно апрувимо, подія
          зʼявиться на карті, і ветерани зможуть бронювати місця.
        </p>

        <section
          aria-label="Що відправлено"
          className="border-border-soft mt-7 flex w-full flex-col gap-2.5 rounded-2xl border bg-white px-5 py-4.5 text-left shadow-soft"
        >
          <span
            className="text-text-muted"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Що відправлено
          </span>
          <span
            className="text-text"
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            {title}
          </span>
          <div
            className="text-text2 flex items-center gap-2.5"
            style={{ fontSize: 13 }}
          >
            <CalIcon size={14} />
            {dateLine}
            {draft.place ? (
              <>
                <span className="text-text-muted" aria-hidden>
                  ·
                </span>
                <PinIcon size={13} />
                <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {draft.place}
                </span>
              </>
            ) : null}
          </div>
          <div
            className="mt-2 flex items-center justify-between rounded-[10px] px-3 py-2.5"
            style={{
              background: "#F1F5EE",
              border: "1px solid #DEEBD8",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-primary-ink)",
              }}
            >
              Квота для ветеранів
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--color-primary-ink)",
              }}
            >
              {quotaShown} {placesLabel(quotaShown)}
            </span>
          </div>
        </section>

        <div className="mt-7 flex w-full flex-col gap-3">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            onClick={onRestart}
            icon={<PlusIcon size={17} stroke="#fff" />}
          >
            Створити ще одну подію
          </Btn>
          <Link href="/map" aria-label="Повернутись до Подій">
            <Btn kind="secondary" size="lg" fullWidth asLink>
              Повернутись до Подій
            </Btn>
          </Link>
        </div>

        <p
          className="text-text-muted mt-6 m-0"
          style={{ fontSize: 12, lineHeight: 1.5 }}
        >
          Сповіщення про апрув прийде на твою пошту.
        </p>
      </div>
    </main>
  );

  if (isDesktop) {
    return (
      <div className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}>
        <DesktopNav />
        {card}
        <Overlays desktop />
      </div>
    );
  }
  return card;
}
