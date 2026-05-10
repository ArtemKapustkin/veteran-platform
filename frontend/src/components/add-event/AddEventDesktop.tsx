"use client";

import type { Dispatch, SetStateAction } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill } from "@/components/atoms/Pill";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { DesktopNav } from "@/components/desktop/DesktopNav";
import { Overlays } from "@/components/sheets/Overlays";
import { Stepper } from "./Stepper";
import { SteppedForm } from "./Steps";
import { EventPagePreview } from "./EventPagePreview";
import { STEPS, type EventDraft, type FormStep } from "./draft";

/**
 * Desktop S10 — top nav + a 50/50 split: form on the left (with a full
 * stepper and footer action bar), live preview on the right. The stepper
 * is interactive — completed steps are clickable to jump back.
 */
export function AddEventDesktop({
  draft,
  setDraft,
  step,
  setStep,
  onSubmit,
  submitting = false,
}: {
  draft: EventDraft;
  setDraft: Dispatch<SetStateAction<EventDraft>>;
  step: FormStep["id"];
  setStep: Dispatch<SetStateAction<FormStep["id"]>>;
  onSubmit: () => void;
  submitting?: boolean;
}) {
  const isLast = step === STEPS.length;
  const next = () => {
    if (isLast) onSubmit();
    else setStep((s) => (s + 1) as FormStep["id"]);
  };
  const prev = () => setStep((s) => Math.max(1, s - 1) as FormStep["id"]);

  return (
    <div className="bg-bg flex flex-col" style={{ height: "100vh" }}>
      <DesktopNav />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT: form */}
        <section
          className="border-border-soft flex flex-col border-r bg-white"
          style={{ flex: "1 1 50%", minWidth: 0 }}
          aria-label="Форма події"
        >
          <header
            className="border-border-soft flex-shrink-0 border-b px-8 pt-6 pb-5.5"
          >
            <h1
              className="text-text m-0"
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              Додати подію
            </h1>
            <p
              className="text-text2 m-0 mt-1 mb-4.5"
              style={{ fontSize: 13 }}
            >
              Для організацій. Зʼявиться на платформі після апруву.
            </p>
            <Stepper step={step} onJump={setStep} />
          </header>

          <div className="flex-1 overflow-auto px-8 pt-7 pb-6">
            <SteppedForm step={step} draft={draft} set={setDraft} />
          </div>

          <footer
            className="border-border-soft flex flex-shrink-0 items-center gap-2.5 border-t bg-white px-8 pt-3.5 pb-4.5"
          >
            {step > 1 ? (
              <Btn
                kind="secondary"
                size="md"
                onClick={prev}
                icon={<BackIcon size={15} />}
              >
                Назад
              </Btn>
            ) : (
              <span aria-hidden style={{ width: 108 }} />
            )}
            <span
              className="text-text-muted flex-1 text-center"
              style={{ fontSize: 12 }}
            >
              Крок {step} з {STEPS.length}
            </span>
            <Btn
              kind="primary"
              size="md"
              onClick={next}
              disabled={isLast && submitting}
              iconRight={!isLast ? <ArrowIcon size={15} /> : undefined}
              style={{ minWidth: isLast ? 170 : 120 }}
            >
              {isLast
                ? submitting
                  ? "Надсилаємо…"
                  : "Опублікувати подію"
                : "Далі"}
            </Btn>
          </footer>
        </section>

        {/* RIGHT: live preview */}
        <section
          className="bg-bg flex flex-col"
          style={{ flex: "1 1 50%", minWidth: 0 }}
          aria-label="Превʼю події"
        >
          <header
            className="border-border-soft flex flex-shrink-0 items-center justify-between border-b bg-white px-7 py-4.5"
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
              Превʼю · картка у списку
            </span>
            <Pill color="grey">live</Pill>
          </header>
          <div className="flex-1 overflow-auto">
            <EventPagePreview draft={draft} />
          </div>
        </section>
      </div>
      <Overlays desktop />
    </div>
  );
}
