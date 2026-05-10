"use client";

import { useState } from "react";
import { ViewportSwitch } from "@/components/ViewportSwitch";
import { AddEventDesktop } from "@/components/add-event/AddEventDesktop";
import { AddEventMobile } from "@/components/add-event/AddEventMobile";
import { SubmittedScreen } from "@/components/add-event/SubmittedScreen";
import { submitDraft } from "@/components/add-event/submit";
import {
  DEFAULT_DRAFT,
  type EventDraft,
  type FormStep,
} from "@/components/add-event/draft";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLoginPromptStore } from "@/lib/useLoginPrompt";

/**
 * Top-level orchestrator for the organizer flow.
 *
 * - Owns the draft + step state so it survives mobile↔desktop layout flips.
 * - Switches between the form (S10) and the success card (S11) using a
 *   `submittedDraft` snapshot — kept in component state so the success
 *   screen continues to render even after the form draft is reset.
 * - Submits to `POST /events` and persists the resulting event id so the
 *   success screen can deep-link the organizer to the moderation queue.
 */
export function AddEventEntry() {
  const isAuthed = useAuthStore((s) => s.loggedIn);
  const [draft, setDraft] = useState<EventDraft>(() => makeDraft());
  const [step, setStep] = useState<FormStep["id"]>(1);
  const [submittedDraft, setSubmittedDraft] = useState<EventDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!isAuthed) {
      // Veteran-only endpoint — surface the global login modal so the
      // user can authenticate without leaving this draft.
      useLoginPromptStore.getState().open("Щоб опублікувати подію");
      return;
    }
    setSubmitting(true);
    try {
      await submitDraft(draft);
      setSubmittedDraft(snapshot(draft));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useLoginPromptStore.getState().open("Щоб опублікувати подію");
        return;
      }
      const detail =
        e instanceof ApiError && e.details
          ? Object.values(e.details).join("\n")
          : (e as Error).message;
      window.alert(`Не вдалось створити подію:\n${detail}`);
    } finally {
      setSubmitting(false);
    }
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
          submitting={submitting}
        />
      }
      desktop={
        <AddEventDesktop
          draft={draft}
          setDraft={setDraft}
          step={step}
          setStep={setStep}
          onSubmit={onSubmit}
          submitting={submitting}
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
