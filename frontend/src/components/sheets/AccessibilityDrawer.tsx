"use client";

import { useSyncExternalStore } from "react";
import { CloseIcon } from "@/components/icons";
import { useA11yStore, type TextSize } from "@/lib/store";
import { isVoiceSupported } from "@/lib/voice";

const voiceSubscribe = () => () => {};
const voiceClient = () => isVoiceSupported();
const voiceServer = () => false;

const TOGGLE_BG_ON = "var(--color-success)";
const TOGGLE_BG_OFF = "#E5E3DD";

function Toggle({
  label,
  hint,
  on,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div
          className="text-text"
          style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
        >
          {label}
        </div>
        <div
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
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="relative h-7 flex-shrink-0 rounded-[14px]"
        style={{
          width: 46,
          background: on ? TOGGLE_BG_ON : TOGGLE_BG_OFF,
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
          opacity: disabled ? 0.5 : 1,
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
    voiceInput,
    setTextSize,
    setHighContrast,
    setReduceMotion,
    setVoiceInput,
  } = useA11yStore();

  const voiceSupported = useSyncExternalStore(
    voiceSubscribe,
    voiceClient,
    voiceServer,
  );

  const SIZE_BUTTONS: { key: TextSize; lab: string; fs: number }[] = [
    { key: "sm", lab: "A−", fs: 13 },
    { key: "md", lab: "A", fs: 16 },
    { key: "lg", lab: "A+", fs: 19 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      className="absolute inset-0 z-50 overflow-hidden"
    >
      <button
        type="button"
        aria-label="Закрити"
        onClick={onClose}
        className="absolute inset-0 bg-black/15 backdrop-blur-[1px]"
      />

      <div
        className="bg-surface absolute inset-y-0 right-0 flex flex-col rounded-l-[18px]"
        style={{
          width: "88%",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.12)",
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
            className="text-text flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#F2F1ED]"
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
              className="text-text mb-2.5"
              style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
            >
              Розмір тексту
            </div>
            <div
              className="flex rounded-xl bg-[#F2F1ED] p-0.5"
              role="radiogroup"
              aria-label="Розмір тексту"
            >
              {SIZE_BUTTONS.map((b) => {
                const on = textSize === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setTextSize(b.key)}
                    className="flex-1 rounded-[10px] py-2.5 text-center transition"
                    style={{
                      background: on ? "#fff" : "transparent",
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
            label="Високий контраст"
            hint="Темніший текст, виразніші межі"
            on={highContrast}
            onChange={setHighContrast}
          />
          <Toggle
            label="Голосовий ввід"
            hint={
              voiceSupported
                ? "Натисни мікрофон у пошуку — кажи що шукаєш"
                : "Браузер не підтримує — спробуй в Chrome"
            }
            on={voiceInput && voiceSupported}
            onChange={setVoiceInput}
            disabled={!voiceSupported}
          />
          <Toggle
            label="Менше анімацій"
            hint="Без переходів і пульсацій"
            on={reduceMotion}
            onChange={setReduceMotion}
          />

          <div
            className="flex gap-2.5 rounded-xl bg-[#F8F6F1] px-4 py-3.5"
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
              Налаштування зберігаються локально. Можна змінити будь-коли —
              кнопка ♿ зверху на карті.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
