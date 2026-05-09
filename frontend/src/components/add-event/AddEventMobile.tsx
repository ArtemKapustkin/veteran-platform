"use client";

import Link from "next/link";
import { useState, type Dispatch, type SetStateAction } from "react";
import { Btn } from "@/components/atoms/Btn";
import { ArrowIcon, BackIcon } from "@/components/icons";
import { Stepper } from "./Stepper";
import { SteppedForm } from "./Steps";
import { MobilePreviewOverlay } from "./MobilePreviewOverlay";
import { STEPS, type EventDraft, type FormStep } from "./draft";

/**
 * Mobile S10 — stepped form with a sticky bottom action bar (back / preview /
 * next | publish). Lifts draft + step state to the parent so navigating
 * away and resizing across the desktop breakpoint don't drop user input.
 */
export function AddEventMobile({
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const isLast = step === STEPS.length;

  const next = () => {
    if (isLast) onSubmit();
    else setStep((s) => (s + 1) as FormStep["id"]);
  };
  const prev = () => setStep((s) => Math.max(1, s - 1) as FormStep["id"]);

  return (
    <main
      aria-label="Додати подію"
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <header
        className="border-border-soft flex flex-shrink-0 items-center gap-3 border-b bg-white px-4 py-3"
      >
        <Link
          href="/map"
          aria-label="Повернутись на карту"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F2F1ED]"
        >
          <BackIcon size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div
            className="text-text"
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.015em",
            }}
          >
            Додати подію
          </div>
          <div className="text-text2" style={{ fontSize: 12 }}>
            для організацій
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 px-4.5 pt-4 pb-1">
        <Stepper step={step} compact />
      </div>

      <div className="flex-1 overflow-auto px-4.5 pt-4.5 pb-32">
        <SteppedForm step={step} draft={draft} set={setDraft} />
      </div>

      <div
        className="bg-surface absolute right-3 bottom-4.5 left-3 flex items-center gap-2 rounded-[14px] p-2.5 shadow-md"
      >
        {step > 1 ? (
          <Btn
            kind="secondary"
            size="md"
            onClick={prev}
            icon={<BackIcon size={15} />}
            aria-label="Попередній крок"
          >
            <span className="sr-only">Назад</span>
          </Btn>
        ) : null}
        <Btn
          kind="ghost"
          size="md"
          onClick={() => setPreviewOpen(true)}
          className="flex-shrink-0"
        >
          Превʼю
        </Btn>
        <span aria-hidden className="flex-1" />
        <Btn
          kind="primary"
          size="md"
          onClick={next}
          disabled={isLast && submitting}
          iconRight={!isLast ? <ArrowIcon size={15} /> : undefined}
          style={{ minWidth: isLast ? 140 : 120 }}
        >
          {isLast ? (submitting ? "Надсилаємо…" : "Опублікувати") : "Далі"}
        </Btn>
      </div>

      {previewOpen ? (
        <MobilePreviewOverlay
          draft={draft}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </main>
  );
}
