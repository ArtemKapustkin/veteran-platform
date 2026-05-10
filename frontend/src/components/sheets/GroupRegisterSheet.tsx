"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { CloseIcon, PhoneIcon } from "@/components/icons";
import type { AppEvent } from "@/data/events";
import { ApiError } from "@/lib/api";
import { useEventsStore } from "@/lib/store";
import { toast } from "@/lib/useToast";

// Group-RSVP modal. Lets a registered veteran reserve 2..4 seats and
// enter companion phone numbers; backend persists pending companion rows
// and sends each phone an SMS invitation. The user themselves count as
// one seat, so we collect `seats - 1` phones.
//
// Phone format mirrors the backend rule in
// `backend/internal/http_handler/validation_rules.go` (E.164):
//   /^\+[1-9]\d{7,14}$/

const E164 = /^\+[1-9]\d{7,14}$/;
const SEAT_OPTIONS = [2, 3, 4] as const;
const DEFAULT_PREFIX = "+380";

interface GroupRegisterSheetProps {
  event: AppEvent;
  onClose: () => void;
}

export function GroupRegisterSheet({ event, onClose }: GroupRegisterSheetProps) {
  const router = useRouter();
  const setRsvpGroup = useEventsStore((s) => s.setRsvpGroup);

  const [seats, setSeats] = useState<2 | 3 | 4>(2);
  // Keep the inputs sized to the max possible group so changing seats
  // doesn't blow away what the user already typed.
  const [phones, setPhones] = useState<string[]>([
    DEFAULT_PREFIX,
    DEFAULT_PREFIX,
    DEFAULT_PREFIX,
  ]);
  const [errors, setErrors] = useState<(string | null)[]>([null, null, null]);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lock body scroll + Escape-to-close, standard for our dialogs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, submitting]);

  const visibleCount = seats - 1;

  const trimmedPhones = useMemo(
    () => phones.slice(0, visibleCount).map((p) => p.trim()),
    [phones, visibleCount],
  );

  const validate = (): boolean => {
    const next: (string | null)[] = [...errors];
    let ok = true;
    const seen = new Set<string>();
    for (let i = 0; i < visibleCount; i++) {
      const phone = trimmedPhones[i];
      if (!phone || phone === DEFAULT_PREFIX) {
        next[i] = "Введи номер у форматі +380…";
        ok = false;
      } else if (!E164.test(phone)) {
        next[i] = "Невірний формат. Приклад: +380501234567";
        ok = false;
      } else if (seen.has(phone)) {
        next[i] = "Номер уже у списку";
        ok = false;
      } else {
        next[i] = null;
        seen.add(phone);
      }
    }
    setErrors(next);
    return ok;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await setRsvpGroup(event.id, seats, trimmedPhones);
      toast.success(
        "Запросили побратимів",
        "Чекаємо їхнього підтвердження — місця заброньовані на 24 години.",
      );
      onClose();
      // Land the user on the full event page so they see the "Ти йдеш"
      // confirmation card right away (matches solo RSVP behaviour).
      router.push(`/events/${event.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        // Field-level errors come back keyed by struct field name.
        // Backend uses "companion_phones" for the array; per-row errors
        // can land as "companion_phones[0]" etc. — fall back to a toast
        // when we can't pinpoint the row.
        if (e.code === "validation_error" && e.details) {
          const next: (string | null)[] = [...errors];
          let mapped = false;
          for (const [key, msg] of Object.entries(e.details)) {
            const m = key.match(/companion_phones(?:\[(\d+)\])?/);
            if (m) {
              const idx = m[1] ? Number(m[1]) : 0;
              if (idx < visibleCount) {
                next[idx] = String(msg);
                mapped = true;
              }
            }
          }
          if (mapped) {
            setErrors(next);
            return;
          }
        }
        toast.error("Не вдалось записатись", e.message);
      } else {
        toast.error("Не вдалось записатись", (e as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updatePhone = (idx: number, value: string) => {
    setPhones((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
    setErrors((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  return (
    <div
      role="presentation"
      onClick={() => {
        if (!submitting) onClose();
      }}
      className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:px-4 sm:py-6"
      style={{ background: "rgba(20,18,15,0.46)" }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-register-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface relative flex w-full flex-col rounded-t-3xl px-5 pt-6 pb-6 sm:max-w-[460px] sm:rounded-3xl sm:px-6 sm:pt-7"
        style={{
          maxHeight: "calc(100dvh - 24px)",
          overflowY: "auto",
          boxShadow: "0 24px 56px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.04)",
          animation: "var(--animate-pop-down)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Закрити"
          className="text-text2 hover:text-text absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl disabled:opacity-50"
        >
          <CloseIcon size={18} />
        </button>

        <h2
          id="group-register-title"
          className="text-text m-0 pr-8"
          style={{
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          Запросити побратима
        </h2>
        <p
          className="text-text2 mt-2 mb-0"
          style={{ fontSize: 13.5, lineHeight: 1.5 }}
        >
          Бронюємо до 4 місць на «{event.title}». Ми надішлемо SMS-запрошення —
          у них буде 24 години, щоб підтвердити.
        </p>

        <fieldset className="mt-5 flex flex-col gap-2.5" disabled={submitting}>
          <legend
            className="text-text-muted mb-1.5 block px-0"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Скільки місць
          </legend>
          <div
            role="radiogroup"
            aria-label="Кількість місць"
            className="border-border flex w-full overflow-hidden rounded-[10px] border bg-white"
          >
            {SEAT_OPTIONS.map((n) => {
              const on = seats === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSeats(n)}
                  className="flex-1 px-3 py-2.5 transition-colors"
                  style={{
                    background: on ? "var(--color-primary)" : "transparent",
                    color: on ? "#fff" : "var(--color-text)",
                    fontSize: 14,
                    fontWeight: 600,
                    letterSpacing: "-0.005em",
                  }}
                >
                  {n} місця
                </button>
              );
            })}
          </div>
          <p className="text-text2 m-0" style={{ fontSize: 12 }}>
            Ти займаєш одне місце; інші — для побратимів.
          </p>
        </fieldset>

        <div className="mt-5 flex flex-col gap-3">
          <div
            className="text-text-muted block"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Телефони побратимів
          </div>
          {Array.from({ length: visibleCount }).map((_, i) => {
            const inputId = `group-phone-${i}`;
            const err = errors[i];
            return (
              <div key={i} className="flex flex-col gap-1">
                <label
                  htmlFor={inputId}
                  className="text-text2"
                  style={{ fontSize: 12.5, fontWeight: 500 }}
                >
                  Побратим #{i + 1}
                </label>
                <div className="relative">
                  <span
                    aria-hidden
                    className="text-text-muted absolute left-3 top-1/2 -translate-y-1/2"
                  >
                    <PhoneIcon size={16} />
                  </span>
                  <input
                    id={inputId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phones[i] ?? ""}
                    onChange={(e) => updatePhone(i, e.target.value)}
                    placeholder="+380501234567"
                    aria-invalid={err ? true : undefined}
                    aria-describedby={err ? `${inputId}-err` : undefined}
                    disabled={submitting}
                    className="border-border focus:border-primary text-text w-full rounded-[10px] border bg-white py-2.5 pl-9 pr-3.5 outline-none transition-colors placeholder:text-[var(--color-text-muted)] disabled:opacity-60"
                    style={{
                      fontSize: 14,
                      borderColor: err ? "#C04848" : undefined,
                    }}
                  />
                </div>
                {err ? (
                  <p
                    id={`${inputId}-err`}
                    className="m-0"
                    style={{ color: "#C04848", fontSize: 12 }}
                  >
                    {err}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            loading={submitting}
            onClick={handleSubmit}
          >
            Надіслати запрошення
          </Btn>
          <Btn
            kind="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            disabled={submitting}
          >
            Скасувати
          </Btn>
        </div>
      </div>
    </div>
  );
}
