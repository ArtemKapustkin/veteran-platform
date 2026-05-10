"use client";

import { useRef, useState, type ReactNode } from "react";
import { CheckIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { Photo, type PhotoTone } from "@/components/atoms/Photo";
import { eventsApi, ApiError } from "@/lib/api";
import { COVER_TONES } from "./draft";

/** Allowed MIME types for `POST .../uploads/event-cover` (mirror backend). */
export const COVER_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp";
/** Max multipart size for event covers (`upload_handler.go` uses 10MB). */
export const COVER_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

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
// Click the dashed frame to open a file picker; the chosen file is uploaded
// straight away to `POST /api/v1/me/uploads/event-cover` and the returned
// URL is stored on the draft (`coverUrl`). Swatches below stay live so the
// organiser can pick a fallback tone for templates that don't have a photo.

function CoverUploadSpinner() {
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 22,
        border: "2px solid rgba(58,35,11,0.18)",
        borderTopColor: "var(--color-primary)",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.85s linear infinite",
      }}
    />
  );
}

export function CoverPicker({
  tone,
  imageUrl,
  onToneChange,
  onImageChange,
}: {
  tone: PhotoTone;
  imageUrl: string | null;
  onToneChange: (next: PhotoTone) => void;
  onImageChange: (next: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    if (busy) return;
    setError(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the native input so picking the same file twice in a row still
    // fires `change` (browsers dedupe identical selections otherwise).
    e.target.value = "";
    if (!file) return;
    if (!COVER_UPLOAD_ACCEPT.split(",").includes(file.type)) {
      setError("Підтримуємо JPG, PNG, WEBP");
      return;
    }
    if (file.size > COVER_UPLOAD_MAX_BYTES) {
      setError(
        `Файл завеликий — максимум ${COVER_UPLOAD_MAX_BYTES / 1024 / 1024} МБ`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await eventsApi.uploadCover(file);
      onImageChange(url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Спочатку увійди — сесія закінчилась або немає доступу");
      } else {
        setError(
          err instanceof Error ? err.message : "Не вдалось завантажити фото",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = () => {
    setError(null);
    onImageChange(null);
  };

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        aria-label={
          imageUrl ? "Змінити фото обкладинки" : "Завантажити фото обкладинки"
        }
        disabled={busy}
        className="border-border relative block w-full overflow-hidden rounded-[14px] border border-dashed"
        style={{ aspectRatio: "4 / 3", background: "#FBFAF6" }}
      >
        <Photo tone={tone} fill radius={0} imageUrl={imageUrl} alt="" />
        {!imageUrl && !busy ? (
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
        ) : null}
        {busy ? (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{
              background: "rgba(255,255,255,0.7)",
              color: "var(--color-text)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <CoverUploadSpinner />
            Завантажуємо…
          </div>
        ) : null}
        {imageUrl && !busy ? (
          <span
            aria-hidden
            className="absolute left-2.5 bottom-2.5 rounded-[8px] px-2 py-1 backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.92)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text)",
              letterSpacing: "-0.005em",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            Змінити
          </span>
        ) : null}
      </button>

      {imageUrl && !busy ? (
        <button
          type="button"
          onClick={removePhoto}
          aria-label="Видалити завантажене фото"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors"
          style={{
            background: "transparent",
            color: "var(--color-text2)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <CloseIcon size={12} />
          Прибрати фото
        </button>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={COVER_UPLOAD_ACCEPT}
        onChange={onFile}
        className="sr-only"
      />

      {error ? (
        <p
          className="mt-1.5 m-0"
          style={{ fontSize: 12, color: "#C04848", lineHeight: 1.4 }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {COVER_TONES.map((t) => {
          const active = tone === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToneChange(t)}
              aria-label={`Тон обкладинки: ${t}`}
              aria-pressed={active}
              className="h-9 w-9 flex-shrink-0 rounded-[10px] box-border transition-all"
              style={{
                background: TONE_SWATCH[t],
                border: active
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border-soft)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Admin / simple flow: upload produces a public URL; same API as community add-event. */
export function EventCoverUploadField({
  imageUrl,
  onImageUrlChange,
  disabled,
}: {
  /** Stored on the event as `cover_image_url` (HTTPS after upload). */
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const trimmed = imageUrl.trim();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => {
    if (busy || disabled) return;
    setError(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!COVER_UPLOAD_ACCEPT.split(",").includes(file.type)) {
      setError("Підтримуємо JPG, PNG, WEBP");
      return;
    }
    if (file.size > COVER_UPLOAD_MAX_BYTES) {
      setError(
        `Файл завеликий — максимум ${COVER_UPLOAD_MAX_BYTES / 1024 / 1024} МБ`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await eventsApi.uploadCover(file);
      onImageUrlChange(url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Потрібно увійти в систему");
      } else {
        setError(
          err instanceof Error ? err.message : "Не вдалось завантажити зображення",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        aria-label={
          trimmed ? "Змінити фото обкладинки" : "Завантажити фото обкладинки"
        }
        disabled={busy || disabled}
        className="border-border relative block w-full max-w-[420px] overflow-hidden rounded-[14px] border border-dashed"
        style={{ aspectRatio: "16 / 10", background: "#FBFAF6" }}
      >
        <Photo
          tone="cream"
          fill
          radius={0}
          imageUrl={trimmed || null}
          alt=""
        />
        {!trimmed && !busy ? (
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
            Натисни, щоб обрати файл
          </div>
        ) : null}
        {busy ? (
          <div
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{
              background: "rgba(255,255,255,0.75)",
              color: "var(--color-text)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <CoverUploadSpinner />
            Завантажуємо…
          </div>
        ) : null}
        {trimmed && !busy ? (
          <span
            aria-hidden
            className="absolute left-2.5 bottom-2.5 rounded-[8px] px-2 py-1 backdrop-blur-md"
            style={{
              background: "rgba(255,255,255,0.92)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-text)",
              letterSpacing: "-0.005em",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            Змінити
          </span>
        ) : null}
      </button>

      {trimmed && !busy ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            onImageUrlChange("");
          }}
          disabled={disabled}
          aria-label="Прибрати обкладинку"
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50"
          style={{
            background: "transparent",
            color: "var(--color-text2)",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <CloseIcon size={12} />
          Без фото
        </button>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept={COVER_UPLOAD_ACCEPT}
        onChange={onFile}
        className="sr-only"
        disabled={disabled}
      />

      {error ? (
        <p
          className="mt-1.5 m-0"
          style={{ fontSize: 12, color: "#C04848", lineHeight: 1.4 }}
        >
          {error}
        </p>
      ) : null}
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
