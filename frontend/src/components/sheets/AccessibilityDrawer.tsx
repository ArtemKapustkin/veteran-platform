"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { useA11yStore, type TextSize } from "@/lib/store";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Toggle({
  label,
  hint,
  on,
  onChange,
  id,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
  /** Stable id used to wire aria-labelledby / aria-describedby. */
  id: string;
}) {
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div
          id={labelId}
          className="text-text"
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          {label}
        </div>
        <div
          id={hintId}
          className="text-text2 mt-0.5"
          style={{ fontSize: 12, lineHeight: 1.45 }}
        >
          {hint}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onClick={() => onChange(!on)}
        className="a11y-toggle relative h-7 flex-shrink-0 rounded-[14px]"
        data-on={on ? "true" : "false"}
        style={{
          width: 46,
          background: on ? "var(--color-success)" : "var(--color-toggle-off)",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <span
          aria-hidden
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white"
          style={{
            left: on ? "auto" : 2,
            right: on ? 2 : "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.18s ease, right 0.18s ease",
          }}
        />
      </button>
    </div>
  );
}

export function AccessibilityDrawer({ onClose }: { onClose: () => void }) {
  const {
    textSize,
    highContrast,
    reduceMotion,
    setTextSize,
    setHighContrast,
    setReduceMotion,
    reset,
  } = useA11yStore();

  const dialogRef = useRef<HTMLDivElement>(null);

  // Body scroll lock + focus management. On mount we (1) remember which
  // element the user opened the drawer from so we can restore focus on
  // close, (2) focus the close button as the first interactive target,
  // (3) trap Tab inside the dialog. Escape is owned by `Overlays`.
  useEffect(() => {
    const previouslyFocused =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("data-skip-focus"),
      );

    // Focus the close button so SR reads the dialog title via aria-labelledby
    // and Tab proceeds through the controls in DOM order.
    const initial = focusables()[0];
    initial?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger so keyboard users keep their place.
      // Guarded because the trigger may have unmounted during the open.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  const SIZE_BUTTONS: { key: TextSize; lab: string; fs: number }[] = [
    { key: "sm", lab: "A−", fs: 13 },
    { key: "md", lab: "A", fs: 16 },
    { key: "lg", lab: "A+", fs: 19 },
    { key: "xl", lab: "A++", fs: 22 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      <button
        type="button"
        aria-label="Закрити"
        data-skip-focus
        tabIndex={-1}
        onClick={onClose}
        className="a11y-backdrop absolute inset-0 backdrop-blur-[1px]"
      />

      <div
        ref={dialogRef}
        className="bg-surface absolute inset-y-0 right-0 flex w-[88%] max-w-[92vw] flex-col rounded-l-[18px] lg:w-[400px]"
        style={{
          boxShadow: "-12px 0 32px rgba(0,0,0,0.12)",
          animation: "var(--animate-slide-in-right)",
        }}
      >
        <div className="flex items-center justify-between px-4.5 pt-3.5 pb-1">
          <span
            className="text-text2"
            style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.005em" }}
          >
            Доступність
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити доступність"
            className="a11y-chip-strong text-text flex h-9 w-9 items-center justify-center rounded-[11px]"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="px-5.5 pt-3">
          <h1
            id="a11y-title"
            className="text-text m-0"
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: "-0.03em",
            }}
          >
            Налаштувати під себе
          </h1>
          <p
            className="text-text2 mt-1.5"
            style={{ fontSize: 13, lineHeight: 1.5 }}
          >
            Все працює одразу. Зміниться лише у тебе.
          </p>
        </div>

        <div className="flex flex-col gap-6 px-5.5 py-6">
          <div>
            <div
              id="a11y-text-size-label"
              className="text-text mb-2.5"
              style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
            >
              Розмір тексту
            </div>
            <div
              className="a11y-chip flex rounded-xl p-0.5"
              role="radiogroup"
              aria-labelledby="a11y-text-size-label"
            >
              {SIZE_BUTTONS.map((b) => {
                const on = textSize === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`Розмір тексту ${b.lab}`}
                    onClick={() => setTextSize(b.key)}
                    className="a11y-size-pill flex-1 rounded-[10px] py-2.5 text-center transition"
                    data-on={on ? "true" : "false"}
                    style={{
                      background: on ? "var(--color-surface)" : "transparent",
                      color: "var(--color-text)",
                      fontSize: b.fs,
                      fontWeight: 500,
                      boxShadow: on
                        ? "0 1px 3px rgba(0,0,0,0.08)"
                        : "none",
                    }}
                  >
                    {b.lab}
                  </button>
                );
              })}
            </div>
          </div>

          <Toggle
            id="a11y-high-contrast"
            label="Високий контраст"
            hint="Чорний текст на білому, жирніші межі"
            on={highContrast}
            onChange={setHighContrast}
          />
          <Toggle
            id="a11y-reduce-motion"
            label="Менше анімацій"
            hint="Без переходів і пульсацій"
            on={reduceMotion}
            onChange={setReduceMotion}
          />

          <div className="flex items-center justify-between gap-3">
            <span
              className="text-text2"
              style={{ fontSize: 12.5, lineHeight: 1.45 }}
            >
              Скинути все до початкових налаштувань
            </span>
            <button
              type="button"
              onClick={reset}
              className="a11y-chip text-text flex h-8 items-center rounded-[10px] px-3"
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
              }}
            >
              Скинути
            </button>
          </div>

          <div
            className="a11y-tip flex gap-2.5 rounded-xl px-4 py-3.5"
            style={{
              fontSize: 13,
              color: "var(--color-text)",
              lineHeight: 1.55,
            }}
          >
            <span aria-hidden style={{ fontSize: 18 }}>
              💡
            </span>
            <span className="text-text2 flex-1">
              Налаштування зберігаються лише на цьому пристрої. Можна
              змінити будь-коли — кнопка «Доступність» у меню.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
