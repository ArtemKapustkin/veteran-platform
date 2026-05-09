"use client";

import type { ReactNode } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Photo, type PhotoTone } from "@/components/atoms/Photo";
import { COVER_TONES } from "./draft";

// ─── Label / FieldGroup ──────────────────────────────

export function FormLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-text-muted mb-2 block"
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {children}
      {required ? (
        <span style={{ color: "#C04848", marginLeft: 4 }} aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

export function FormFieldGroup({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <FormLabel required={required} htmlFor={htmlFor}>
        {label}
      </FormLabel>
      {children}
      {hint ? (
        <p
          className="text-text2 mt-1.5 m-0"
          style={{ fontSize: 12, lineHeight: 1.45 }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─── Inputs ───────────────────────────────────────────

const INPUT_CLASS =
  "border-border focus:border-primary text-text w-full rounded-[10px] border bg-white px-3.5 py-2.5 outline-none transition-colors placeholder:text-[var(--color-text-muted)]";

export function FormInput({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  min,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date" | "time" | "url" | "email";
  inputMode?: "text" | "numeric" | "decimal";
  min?: number;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      min={min}
      className={INPUT_CLASS}
      style={{ fontSize: 14 }}
    />
  );
}

export function FormTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${INPUT_CLASS} resize-y`}
      style={{ fontSize: 14, lineHeight: 1.5 }}
    />
  );
}

// ─── Chips ────────────────────────────────────────────
//
// Single-mode: value is a string ("" means nothing selected). Toggling the
// active chip clears the selection.
// Multi-mode: value is a Set<string>. Each chip adds/removes itself.

type ChipOption = string | { id: string; label: string };

interface ChipsCommonProps {
  options: readonly ChipOption[];
  size?: "sm" | "md";
}

interface SingleChipsProps extends ChipsCommonProps {
  multi?: false;
  value: string;
  onChange: (next: string) => void;
}

interface MultiChipsProps extends ChipsCommonProps {
  multi: true;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}

export type FormChipsProps = SingleChipsProps | MultiChipsProps;

function chipKey(opt: ChipOption): string {
  return typeof opt === "string" ? opt : opt.id;
}

function chipLabel(opt: ChipOption): string {
  return typeof opt === "string" ? opt : opt.label;
}

export function FormChips(props: FormChipsProps) {
  const { options, size = "md" } = props;
  const padding = size === "sm" ? "px-3 py-1.5" : "px-3.5 py-2.5";

  const isOn = (id: string): boolean =>
    props.multi ? props.value.has(id) : props.value === id;

  const onPick = (id: string) => {
    if (props.multi) {
      const next = new Set(props.value);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      props.onChange(next);
    } else {
      props.onChange(props.value === id ? "" : id);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const id = chipKey(opt);
        const on = isOn(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full ${padding} transition-colors`}
            style={{
              background: on ? "#1A1A1A" : "#fff",
              color: on ? "#fff" : "var(--color-text)",
              border: on ? "none" : "1px solid var(--color-border)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
          >
            {on ? <CheckIcon size={13} /> : null}
            {chipLabel(opt)}
          </button>
        );
      })}
    </div>
  );
}

// ─── Cover picker ─────────────────────────────────────
//
// Upload is intentionally a placeholder — clicking the dashed frame doesn't
// open a file dialog yet. The tone swatches below are functional and feed
// the live preview's photo gradient.

export function CoverPicker({
  value,
  onChange,
}: {
  value: PhotoTone;
  onChange: (next: PhotoTone) => void;
}) {
  return (
    <div>
      <div
        role="img"
        aria-label="Обкладинка події"
        className="border-border relative w-full overflow-hidden rounded-[14px] border border-dashed"
        style={{ aspectRatio: "4 / 3", background: "#FBFAF6" }}
      >
        <Photo tone={value} fill radius={0} alt="" />
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
          style={{
            color: "rgba(58,35,11,0.7)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.7)" }}
          >
            <PlusIcon size={22} />
          </div>
          Завантажити фото · опційно
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {COVER_TONES.map((tone) => {
          const active = value === tone;
          return (
            <button
              key={tone}
              type="button"
              onClick={() => onChange(tone)}
              aria-label={`Тон обкладинки: ${tone}`}
              aria-pressed={active}
              className="h-9 w-9 flex-shrink-0 rounded-[10px] box-border transition-all"
              style={{
                background: TONE_SWATCH[tone],
                border: active
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border-soft)",
              }}
            />
          );
        })}
        <span
          className="text-text-muted self-center"
          style={{ fontSize: 12, marginLeft: 4 }}
        >
          або обери тон
        </span>
      </div>
    </div>
  );
}

const TONE_SWATCH: Record<PhotoTone, string> = {
  cream: "#EFE6D2",
  sand: "#E8DAC4",
  sage: "#D7DECB",
  green: "#D5E1C9",
  blue: "#CBD8E3",
  rose: "#E6CFCB",
};
