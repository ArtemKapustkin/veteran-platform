"use client";

import { useState } from "react";
import { ViewportSwitch } from "@/components/ViewportSwitch";
import { AddEventDesktop } from "@/components/add-event/AddEventDesktop";
import { AddEventMobile } from "@/components/add-event/AddEventMobile";
import { SubmittedScreen } from "@/components/add-event/SubmittedScreen";
import {
  DEFAULT_DRAFT,
  type EventDraft,
  type FormStep,
} from "@/components/add-event/draft";

/**
 * Top-level orchestrator for the organizer flow.
 *
 * - Owns the draft + step state so it survives mobile↔desktop layout flips.
 * - Switches between the form (S10) and the success card (S11) using a
 *   `submittedDraft` snapshot — kept in component state so the success
 *   screen continues to render even after the form draft is reset.
 */
export function AddEventEntry() {
  const [draft, setDraft] = useState<EventDraft>(() => makeDraft());
  const [step, setStep] = useState<FormStep["id"]>(1);
  const [submittedDraft, setSubmittedDraft] = useState<EventDraft | null>(null);

  const onSubmit = () => {
    setSubmittedDraft(snapshot(draft));
  };

  const onRestart = () => {
    setDraft(makeDraft());
    setStep(1);
    setSubmittedDraft(null);
  };

  if (submittedDraft) {
    return <SubmittedScreen draft={submittedDraft} onRestart={onRestart} />;
  }

  return (
    <ViewportSwitch
      mobile={
        <AddEventMobile
          draft={draft}
          setDraft={setDraft}
          step={step}
          setStep={setStep}
          onSubmit={onSubmit}
        />
      }
      desktop={
        <AddEventDesktop
          draft={draft}
          setDraft={setDraft}
          step={step}
          setStep={setStep}
          onSubmit={onSubmit}
        />
      }
    />
  );
}

// `comfort` is a Set, so DEFAULT_DRAFT can't be reused by reference between
// renders — we'd alias the same Set across instances. Clone on each init.
function makeDraft(): EventDraft {
  return { ...DEFAULT_DRAFT, comfort: new Set<string>() };
}

function snapshot(draft: EventDraft): EventDraft {
  return { ...draft, comfort: new Set(draft.comfort) };
}
