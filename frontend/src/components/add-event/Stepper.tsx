"use client";

import { Fragment } from "react";
import { CheckIcon } from "@/components/icons";
import { STEPS, type FormStep } from "./draft";

/**
 * Visual progress for the 3-step organizer form.
 *
 * Variants:
 *   - `compact` (mobile): "Крок N з 3" + a horizontal segmented bar.
 *   - default (desktop): full row of numbered nodes with labels and
 *     connector lines, optionally clickable to jump back.
 */
export function Stepper({
  step,
  compact = false,
  onJump,
}: {
  step: FormStep["id"];
  compact?: boolean;
  onJump?: (id: FormStep["id"]) => void;
}) {
  if (compact) {
    const current = STEPS[step - 1];
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span
            className="text-text-muted"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Крок {step} з {STEPS.length}
          </span>
          <span
            className="text-text"
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
          aria-valuemax={STEPS.length}
          aria-valuenow={step}
        >
          {STEPS.map((s) => (
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
      className="flex items-center"
      role="list"
      aria-label="Етапи створення події"
    >
      {STEPS.map((s, i) => {
        const done = s.id < step;
        const active = s.id === step;
        const interactive = onJump != null && s.id <= step;
        return (
          <Fragment key={s.id}>
            {i > 0 ? (
              <span
                aria-hidden
                className="h-0.5 flex-1 transition-colors"
                style={{
                  margin: "0 12px",
                  background: done ? "var(--color-primary)" : "#E5E3DD",
                }}
              />
            ) : null}
            <li className="flex flex-shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={interactive ? () => onJump?.(s.id) : undefined}
                disabled={!interactive}
                aria-current={active ? "step" : undefined}
                className="flex items-center gap-2.5 disabled:cursor-default"
                style={{ cursor: interactive ? "pointer" : undefined }}
              >
                <span
                  aria-hidden
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
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
                <span className="text-left">
                  <span
                    className="block"
                    style={{
                      fontSize: 14,
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
                    className="text-text-muted block"
                    style={{ fontSize: 11.5, marginTop: 1 }}
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
