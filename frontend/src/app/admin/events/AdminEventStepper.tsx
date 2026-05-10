"use client";

import { Fragment } from "react";
import { CheckIcon } from "@/components/icons";

export interface AdminWizardStepDef {
  id: number;
  label: string;
  hint: string;
}

/**
 * Horizontal stepper matching the organizer `/add-event` desktop pattern,
 * driven by admin-specific step definitions (5–6 steps).
 */
export function AdminEventStepper({
  steps,
  step,
  compact = false,
  onJump,
}: {
  steps: readonly AdminWizardStepDef[];
  step: number;
  compact?: boolean;
  onJump?: (id: number) => void;
}) {
  const total = steps.length;
  const current = steps.find((s) => s.id === step) ?? steps[0];

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-text-muted"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Крок {step} з {total}
          </span>
          <span
            className="text-text min-w-0 truncate text-right"
            style={{
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            {current.label}
          </span>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
        >
          {steps.map((s) => (
            <span
              key={s.id}
              aria-hidden
              className="h-1 flex-1 rounded-[2px] transition-colors"
              style={{
                background:
                  s.id <= step ? "var(--color-primary)" : "#E5E3DD",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ol
      className="flex min-w-0 items-center gap-0"
      role="list"
      aria-label="Етапи форми події"
    >
      {steps.map((s, i) => {
        const done = s.id < step;
        const active = s.id === step;
        const interactive = onJump != null && s.id <= step;
        return (
          <Fragment key={s.id}>
            {i > 0 ? (
              <span
                aria-hidden
                className="h-0.5 min-w-[8px] flex-1 transition-colors"
                style={{
                  margin: "0 10px",
                  background: done ? "var(--color-primary)" : "#E5E3DD",
                }}
              />
            ) : null}
            <li className="flex min-w-0 flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={interactive ? () => onJump?.(s.id) : undefined}
                disabled={!interactive}
                aria-current={active ? "step" : undefined}
                className="flex min-w-0 max-w-[140px] items-center gap-2 disabled:cursor-default sm:max-w-none"
                style={{ cursor: interactive ? "pointer" : undefined }}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors"
                  style={{
                    background:
                      done || active ? "var(--color-primary)" : "#F2F1ED",
                    color: done || active ? "#fff" : "var(--color-text2)",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {done ? <CheckIcon size={15} stroke="#fff" /> : s.id}
                </span>
                <span className="hidden min-w-0 text-left sm:block">
                  <span
                    className="block truncate"
                    style={{
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active
                        ? "var(--color-text)"
                        : "var(--color-text2)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="text-text-muted block truncate"
                    style={{ fontSize: 10.5, marginTop: 1 }}
                  >
                    {s.hint}
                  </span>
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
