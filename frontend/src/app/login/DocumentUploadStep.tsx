"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Btn } from "@/components/atoms/Btn";
import {
  ChevronDownIcon,
  CloseIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { ApiError, verificationApi } from "@/lib/api";
import type { DocumentType } from "@/lib/api/types";
import { refreshMe } from "@/lib/store";

// Mirrors the allow-list in
// `backend/internal/service/application/verification_service.go`
// (`allowedDocumentTypes`). Order them by likely usage so most users
// see their option first.
const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string; sub?: string }[] = [
  { value: "ubd_dia", label: "Посвідчення УБД (ДіЯ)", sub: "Скріншот з ДіЯ" },
  { value: "ubd_paper", label: "Посвідчення УБД (паперове)" },
  { value: "reestr_extract", label: "Витяг з реєстру УБД" },
  { value: "form_6", label: "Форма 6" },
  { value: "military_book", label: "Військовий квиток" },
  { value: "family_fallen", label: "Документ родини загиблого" },
  { value: "self_declaration", label: "Самодекларація", sub: "Тільки в окремих випадках" },
];

const ACCEPTED_MIME =
  "image/jpeg,image/png,image/heic,image/webp,application/pdf";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface Props {
  onApproved: () => void;
  /** AI rejected the documents — wizard should switch to pending review. */
  onRejected: () => void;
}

export function DocumentUploadStep({ onApproved, onRejected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<DocumentType>("ubd_dia");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      setError(null);
      const next: File[] = [...files];
      for (const f of Array.from(incoming)) {
        if (next.length >= MAX_FILES) {
          setError(`Максимум ${MAX_FILES} файлів за одну спробу.`);
          break;
        }
        if (f.size > MAX_FILE_BYTES) {
          setError(`Файл ${f.name} більший за 10 МБ.`);
          continue;
        }
        // De-dupe by name+size — picking the same photo twice is almost
        // certainly an accident, not "I want two copies".
        if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
        next.push(f);
      }
      setFiles(next);
    },
    [files],
  );

  const removeAt = (i: number) => {
    setError(null);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = useCallback(async () => {
    if (busy || files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const state = await verificationApi.submit(docType, files);
      // The verify endpoint returns the freshly-computed VerificationState,
      // but the cached `veteran` in the store still has the old
      // `verified` / `verification_status`. Re-fetch /me so the gate
      // check reflects reality, then route off the AI decision.
      await refreshMe();
      if (state.status === "approved") {
        onApproved();
      } else {
        onRejected();
      }
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, files, docType, onApproved, onRejected]);

  return (
    <>
      <Header />
      <div className="flex flex-col gap-4">
        <DocumentTypeSelect value={docType} onChange={setDocType} />

        <div className="flex flex-col gap-2">
          <span
            className="text-text-muted"
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Файли документа
          </span>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME}
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              // Reset so picking the same file again still fires onChange.
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-border-soft hover:border-primary-ink flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors"
            disabled={busy}
          >
            <span
              className="text-text"
              style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.005em" }}
            >
              Додати фото або PDF
            </span>
            <span className="text-text2" style={{ fontSize: 12.5 }}>
              JPG · PNG · HEIC · WEBP · PDF — до 10 МБ кожен, до {MAX_FILES} файлів
            </span>
          </button>

          {files.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="border-border-soft flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
                >
                  <span
                    className="text-text flex-1 truncate"
                    style={{ fontSize: 13.5, fontWeight: 500 }}
                  >
                    {f.name}
                  </span>
                  <span className="text-text2" style={{ fontSize: 12 }}>
                    {formatBytes(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Видалити ${f.name}`}
                    className="text-text2 hover:text-text flex h-7 w-7 items-center justify-center rounded-md"
                    disabled={busy}
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
              <li
                className="text-text-muted self-end"
                style={{ fontSize: 11.5 }}
              >
                Сумарно: {formatBytes(totalBytes)}
              </li>
            </ul>
          ) : null}
        </div>

        <Btn
          kind="primary"
          size="lg"
          fullWidth
          onClick={submit}
          loading={busy}
          disabled={busy || files.length === 0}
        >
          {busy ? "Перевіряємо…" : "Підтвердити статус"}
        </Btn>

        {error ? (
          <p
            className="m-0 text-center"
            role="alert"
            style={{ fontSize: 13, color: "#C04848", letterSpacing: "-0.005em" }}
          >
            {error}
          </p>
        ) : null}

        <p
          className="text-text-muted m-0 text-center"
          style={{ fontSize: 11.5, lineHeight: 1.5 }}
        >
          Документ перевіряє ШІ. Якщо щось не вийде — адміністратор гляне руками.
        </p>
      </div>
    </>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────

function Header() {
  return (
    <>
      <div className="mt-3 mb-4 flex justify-center">
        <div
          className="flex items-center justify-center rounded-[20px] text-white"
          style={{
            height: 64,
            width: 64,
            background:
              "linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-ink) 100%)",
            boxShadow: "0 8px 24px rgba(31,77,52,0.22)",
          }}
        >
          <ShieldCheckIcon size={30} stroke="currentColor" sw={1.8} />
        </div>
      </div>
      <h1
        className="text-text m-0 text-center"
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
        }}
      >
        Підтвердження статусу
      </h1>
      <p
        className="text-text2 mx-0 mb-6 mt-2.5 text-center"
        style={{ fontSize: 15, lineHeight: 1.5 }}
      >
        Завантаж документ, що підтверджує твій ветеранський статус. Це
        одноразова перевірка.
      </p>
    </>
  );
}

function DocumentTypeSelect({
  value,
  onChange,
}: {
  value: DocumentType;
  onChange: (v: DocumentType) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-text-muted"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Тип документа
      </span>
      <div
        className="border-border-soft focus-within:border-primary-ink relative flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors"
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as DocumentType)}
          className="text-text w-full appearance-none bg-white px-3.5 py-3 pr-10 focus:outline-none"
          style={{ fontSize: 15, letterSpacing: "-0.005em" }}
        >
          {DOCUMENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.sub ? ` — ${opt.sub}` : ""}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="text-text2 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        >
          <ChevronDownIcon size={16} />
        </span>
      </div>
    </label>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${Math.round(b / 102.4) / 10} КБ`;
  return `${Math.round(b / 104857.6) / 10} МБ`;
}

function toMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Сесія закінчилась. Увійди ще раз.";
    if (e.status === 413) return "Файли занадто великі.";
    if (e.status === 429) return "Забагато спроб. Спробуй за хвилину.";
    return e.message || "Не вдалося надіслати документи.";
  }
  if (e instanceof Error) return e.message;
  return "Не вдалося надіслати документи.";
}
