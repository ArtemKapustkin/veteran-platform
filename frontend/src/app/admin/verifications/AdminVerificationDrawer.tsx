"use client";

// Detail dialog for a single veteran's verification queue entry.
//
// Loads `GET /api/v1/admin/veterans/{id}` (which is shaped as
// `{ veteran, verification }` — see `AdminVeteranHandler.Get`) and renders
// the AI history alongside a manual approve/reject form. Submitting hits
// `POST /api/v1/admin/veterans/{id}/verify`.
//
// Important: document images are intentionally NOT stored on this server
// (see backend/openapi.yaml — VerificationDocument). The admin reviews
// the AI's notes, extracted name/ID, and confidence; for ambiguous cases
// they typically reach out to the veteran out-of-band before approving.

import { useEffect, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { CloseIcon } from "@/components/icons";
import { ApiError, adminVeteransApi } from "@/lib/api";
import type {
  AIDecision,
  AdminVeteranDetail,
  DocumentType,
  Veteran,
  VerificationDocument,
  VerificationStatus,
} from "@/lib/api";
import { toast } from "@/lib/useToast";

const STATUS_LABEL: Record<VerificationStatus, string> = {
  none: "Не подано",
  processing: "В обробці",
  pending_review: "На розгляді",
  approved: "Підтверджено",
  rejected: "Відхилено",
};

const STATUS_TONE: Record<VerificationStatus, PillColor> = {
  none: "grey",
  processing: "blue",
  pending_review: "amber",
  approved: "green",
  rejected: "rose",
};

// AI-decision badge palette. We intentionally keep it distinct from the
// status pill so the admin can tell at a glance "AI said unreadable but
// status is pending_review" vs "AI said no_match → pending_review".
const AI_DECISION_LABEL: Record<AIDecision, string> = {
  match: "AI: збіг",
  no_match: "AI: розбіжність",
  unreadable: "AI: нечитабельно",
};

const AI_DECISION_TONE: Record<AIDecision, PillColor> = {
  match: "green",
  no_match: "rose",
  unreadable: "amber",
};

const DOC_TYPE_LABEL: Record<DocumentType, string> = {
  ubd_dia: "Е-посвідчення в Дії",
  ubd_paper: "Посвідчення УБД (паперове)",
  reestr_extract: "Витяг з ЄДРВВ",
  form_6: "Довідка форма 6",
  military_book: "Військовий квиток (УБД)",
  family_fallen: "Посвідчення родини загиблого",
  self_declaration: "Самопідтвердження",
};

const AUDIENCE_LABEL: Record<string, string> = {
  veteran: "Ветеран",
  veteran_female: "Ветеранка",
  family: "Родина ветерана",
  fallen_family: "Родина загиблого",
  active_military: "Діючий військовий",
  other: "Інше",
};

export function AdminVerificationDrawer({
  veteranId,
  onClose,
  onResolved,
}: {
  veteranId: string;
  onClose: () => void;
  onResolved: () => void | Promise<void>;
}) {
  const [data, setData] = useState<AdminVeteranDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  // `decision` is `null` until the admin chooses approve or reject. We use
  // a single submitting flag so both buttons share the same disabled
  // state — clicking either one fires the same API call with a different
  // `approved` boolean.
  const [submitting, setSubmitting] =
    useState<null | "approve" | "reject" | "block">(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load detail ─────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => setLoading(true))
      .then(async () => {
        try {
          const res = await adminVeteransApi.get(veteranId, controller.signal);
          if (!controller.signal.aborted) {
            setData(res);
            setLoadError(null);
          }
        } catch (e) {
          if (controller.signal.aborted) return;
          setLoadError(
            e instanceof Error ? e.message : "Не вдалось завантажити",
          );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      });
    return () => controller.abort();
  }, [veteranId]);

  // ── Lock background scroll while open ───────────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Esc closes the dialog ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && submitting === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const onDecision = async (approved: boolean) => {
    if (note.trim().length > 500) {
      setSubmitError("Коментар не може перевищувати 500 символів.");
      return;
    }
    setSubmitting(approved ? "approve" : "reject");
    setSubmitError(null);
    try {
      await adminVeteransApi.verify(veteranId, approved, note.trim());
      toast.success(approved ? "Ветерана підтверджено" : "Заявку відхилено");
      await onResolved();
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(e.message || "Не вдалось зберегти");
      } else {
        setSubmitError(e instanceof Error ? e.message : "Не вдалось зберегти");
      }
    } finally {
      setSubmitting(null);
    }
  };

  const onBlock = async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Заблокувати акаунт ветерана? Це відкличе всі активні токени і не дозволить йому увійти.",
      );
      if (!ok) return;
    }
    setSubmitting("block");
    setSubmitError(null);
    try {
      await adminVeteransApi.block(veteranId);
      toast.success("Акаунт заблоковано");
      await onResolved();
    } catch (e) {
      if (e instanceof ApiError) {
        setSubmitError(e.message || "Не вдалось заблокувати");
      } else {
        setSubmitError(
          e instanceof Error ? e.message : "Не вдалось заблокувати",
        );
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-verification-title"
      className="fixed inset-0 z-50 flex justify-center"
    >
      <button
        type="button"
        aria-label="Закрити"
        onClick={() => submitting === null && onClose()}
        className="absolute inset-0 bg-black/35"
      />
      <div
        className="bg-bg relative my-0 flex w-full max-w-[760px] flex-col overflow-hidden shadow-2xl sm:my-8 sm:rounded-2xl"
        style={{ maxHeight: "100dvh" }}
      >
        <Header
          veteran={data?.veteran ?? null}
          onClose={() => submitting === null && onClose()}
          submitting={submitting !== null}
        />

        <div className="flex-1 overflow-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="text-text2 px-1 py-12 text-center" style={{ fontSize: 14 }}>
              Завантажуємо дані…
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-[12px] px-3.5 py-2.5"
              style={{
                background: "#FBE8E8",
                color: "#9B3D3D",
                fontSize: 13,
              }}
            >
              {loadError}
            </div>
          ) : data ? (
            <div className="flex flex-col gap-5">
              <ProfileCard veteran={data.veteran} />
              <DocumentsList documents={data.verification.documents} />
              <DecisionCard
                note={note}
                onNote={setNote}
                disabled={submitting !== null}
                error={submitError}
              />
            </div>
          ) : null}
        </div>

        <footer className="border-border-soft flex flex-wrap items-center justify-end gap-2 border-t bg-white px-5 py-4 sm:px-6">
          <Btn
            kind="ghost"
            size="md"
            onClick={onBlock}
            disabled={submitting !== null || !data}
            loading={submitting === "block"}
          >
            Заблокувати
          </Btn>
          <div className="flex-1" />
          <Btn
            kind="secondary"
            size="md"
            onClick={() => void onDecision(false)}
            disabled={submitting !== null || !data}
            loading={submitting === "reject"}
          >
            Відхилити
          </Btn>
          <Btn
            kind="primary"
            size="md"
            onClick={() => void onDecision(true)}
            disabled={submitting !== null || !data}
            loading={submitting === "approve"}
          >
            Підтвердити
          </Btn>
        </footer>
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────

function Header({
  veteran,
  onClose,
  submitting,
}: {
  veteran: Veteran | null;
  onClose: () => void;
  submitting: boolean;
}) {
  return (
    <header className="border-border-soft flex items-center justify-between border-b bg-white px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2
          id="admin-verification-title"
          className="text-text m-0"
          style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Розгляд верифікації
        </h2>
        <div
          className="text-text2 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ fontSize: 12 }}
        >
          {veteran?.fullname || veteran?.phone || "Завантаження…"}
        </div>
      </div>
      <button
        type="button"
        aria-label="Закрити"
        onClick={onClose}
        disabled={submitting}
        className="text-text2 inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CloseIcon size={18} />
      </button>
    </header>
  );
}

// ─── Profile summary ───────────────────────────────────────────────────

function ProfileCard({ veteran }: { veteran: Veteran }) {
  const audienceLabel =
    veteran.audience_status &&
    (AUDIENCE_LABEL[veteran.audience_status] ?? veteran.audience_status);
  return (
    <Section title="Профіль ветерана">
      <div className="flex flex-wrap items-center gap-2">
        <Pill color={STATUS_TONE[veteran.verification_status]}>
          {STATUS_LABEL[veteran.verification_status]}
        </Pill>
        {veteran.account_status === "blocked" ? (
          <Pill color="dark">Заблоковано</Pill>
        ) : null}
        {audienceLabel ? <Pill color="sand">{audienceLabel}</Pill> : null}
      </div>
      <dl className="mt-3 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
        <Field label="ПІБ" value={veteran.fullname} />
        <Field label="Телефон" value={veteran.phone} />
        <Field label="Бригада" value={veteran.brigade} />
        <Field label="Звання" value={veteran.rank} />
        <Field label="Місто" value={veteran.city} />
        <Field
          label="Зареєстрований"
          value={new Date(veteran.created_at).toLocaleDateString("uk-UA", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
      </dl>
    </Section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex flex-col">
      <dt
        className="text-text-muted"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </dt>
      <dd
        className="text-text mt-0.5 m-0"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        {value && value.trim() ? value : <span className="text-text2">—</span>}
      </dd>
    </div>
  );
}

// ─── Documents history ─────────────────────────────────────────────────

function DocumentsList({ documents }: { documents: VerificationDocument[] }) {
  if (documents.length === 0) {
    return (
      <Section title="Подані документи">
        <div className="text-text2" style={{ fontSize: 13 }}>
          Ветеран ще не надсилав документи. Підтвердження тут створить
          адміністративний запис без AI-перевірки.
        </div>
      </Section>
    );
  }
  return (
    <Section title="Подані документи">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </ul>
      <div
        className="text-text-muted mt-1"
        style={{ fontSize: 11.5, lineHeight: 1.5 }}
      >
        Зображення документів не зберігаються на сервері — вони передаються до
        AI-провайдера і одразу видаляються. Ухвалюй рішення на основі
        AI-нотаток, розпізнаних полів та (за потреби) контакту з ветераном.
      </div>
    </Section>
  );
}

function DocumentCard({ doc }: { doc: VerificationDocument }) {
  const ai = doc.ai_result;
  const decidedByAdmin = doc.decided_by === "admin";
  return (
    <li
      className="border-border-soft flex flex-col gap-2 rounded-[12px] border bg-white px-3.5 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-text"
          style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.005em" }}
        >
          {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
        </span>
        {decidedByAdmin ? (
          <Pill color="dark">Рішення адміна</Pill>
        ) : ai ? (
          <Pill color={AI_DECISION_TONE[ai.decision]}>
            {AI_DECISION_LABEL[ai.decision]}
          </Pill>
        ) : null}
        {ai && ai.decision !== "unreadable" ? (
          <span
            className="text-text2"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            {Math.round((ai.confidence ?? 0) * 100)}%
          </span>
        ) : null}
        <span className="flex-1" />
        <span className="text-text-muted" style={{ fontSize: 12 }}>
          {formatTimestamp(doc.uploaded_at)}
        </span>
      </div>

      {(ai?.extracted_name || ai?.extracted_id) && !decidedByAdmin ? (
        <div
          className="text-text2 grid gap-x-4 gap-y-1 sm:grid-cols-2"
          style={{ fontSize: 13 }}
        >
          {ai.extracted_name ? (
            <span>
              <strong className="text-text">ПІБ з документа:</strong>{" "}
              {ai.extracted_name}
            </span>
          ) : null}
          {ai.extracted_id ? (
            <span>
              <strong className="text-text">№ документа:</strong>{" "}
              {ai.extracted_id}
            </span>
          ) : null}
        </div>
      ) : null}

      {ai?.notes ? (
        <p
          className="text-text2 m-0"
          style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}
        >
          {ai.notes}
        </p>
      ) : null}
    </li>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time}`;
}

// ─── Decision form ─────────────────────────────────────────────────────

function DecisionCard({
  note,
  onNote,
  disabled,
  error,
}: {
  note: string;
  onNote: (v: string) => void;
  disabled: boolean;
  error: string | null;
}) {
  return (
    <Section title="Рішення">
      <label className="flex flex-col gap-1.5">
        <span
          className="text-text-muted"
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Коментар (зберігається в історії, до 500 символів)
        </span>
        <textarea
          value={note}
          onChange={(e) => onNote(e.target.value)}
          maxLength={500}
          rows={3}
          disabled={disabled}
          placeholder="Наприклад: підтвердив телефонним дзвінком; УБД виданий 2023 року, дані збігаються."
          className="border-border bg-white text-text rounded-[10px] border px-3 py-2 outline-none focus:border-[var(--color-primary)] disabled:bg-black/5"
          style={{ fontSize: 14, lineHeight: 1.4, resize: "vertical" }}
        />
      </label>
      <div
        className="text-text-muted -mt-1.5 self-end"
        style={{ fontSize: 11 }}
      >
        {note.length}/500
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-[10px] px-3 py-2"
          style={{ background: "#FBE8E8", color: "#9B3D3D", fontSize: 13 }}
        >
          {error}
        </div>
      ) : null}
    </Section>
  );
}

// ─── Layout primitives ─────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-border-soft m-0 flex flex-col gap-3 rounded-[14px] border bg-white px-4 py-4">
      <legend
        className="text-text-muted px-1"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
