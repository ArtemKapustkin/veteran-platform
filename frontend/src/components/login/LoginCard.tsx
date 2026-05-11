"use client";

import {
  type ClipboardEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Btn } from "@/components/atoms/Btn";
import { PhoneIcon, ShieldCheckIcon } from "@/components/icons";
import { authApi, ApiError } from "@/lib/api";
import { loginWithOtp } from "@/lib/store";

// ─── Types & constants ────────────────────────────────────────────────
//
// Veteran-only login: phone → OTP. Admin sign-in lives on its own page
// (separate route, separate UX), so this hook stays a tight two-step
// state machine.

export type Mode = "phone" | "code";

const OTP_LEN = 6;
const RESEND_SECONDS = 60;
const PHONE_PREFIX = "+380";
// Backend accepts E.164; the prefix is fixed (UA-only product) so we
// only collect the 9 local digits.
const LOCAL_PHONE_LEN = 9;

const COPY = {
  phoneTitle: "Вхід через номер телефону",
  phoneSub: "Введи свій номер — надішлемо код у SMS.",
  codeTitle: "Підтвердження коду",
  codeSub: (phone: string) => `Код надіслано на ${phone}.`,
} as const;

interface UseLoginOpts {
  /**
   * Called after a successful veteran login (once the auth store has
   * been updated). The login modal uses this to close itself so the
   * user lands back on whatever they were doing.
   */
  onSuccess?: () => void;
}

// ─── Hook: shared form state for every layout ─────────────────────────

export function useLogin({ onSuccess }: UseLoginOpts = {}) {
  const [mode, setMode] = useState<Mode>("phone");
  const [localPhone, setLocalPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const fullPhone = useMemo(() => `${PHONE_PREFIX}${localPhone}`, [localPhone]);
  const phoneValid = localPhone.length === LOCAL_PHONE_LEN;
  const codeValid = code.length === OTP_LEN;

  // Tick the "resend in Xs" timer once per second while it's positive.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const requestOtp = useCallback(async () => {
    if (!phoneValid || busy) return;
    setError(null);
    setBusy(true);
    try {
      await authApi.requestOtp(fullPhone);
      // SMS is temporarily disabled — surface the fallback code so users
      // (and QA) can still sign in without reading backend docs.
      setHint("SMS тимчасово вимкнено — використай код 044572");
      setMode("code");
      setCode("");
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  }, [busy, fullPhone, phoneValid]);

  const verifyOtp = useCallback(
    async (override?: string) => {
      const value = (override ?? code).trim();
      if (value.length !== OTP_LEN || busy) return;
      setError(null);
      setBusy(true);
      try {
        await loginWithOtp(fullPhone, value);
        onSuccess?.();
      } catch (e) {
        setError(toMessage(e));
        setCode("");
      } finally {
        setBusy(false);
      }
    },
    [busy, code, fullPhone, onSuccess],
  );

  const goPhone = useCallback(() => {
    setMode("phone");
    setError(null);
    setHint(null);
    setCode("");
  }, []);

  return {
    mode,
    localPhone,
    setLocalPhone,
    fullPhone,
    phoneValid,
    code,
    setCode,
    codeValid,
    error,
    hint,
    busy,
    resendIn,
    requestOtp,
    verifyOtp,
    goPhone,
  };
}

export type LoginCtl = ReturnType<typeof useLogin>;

// ─── Card — embed-friendly composition of the form pieces ─────────────

interface LoginCardProps {
  /** Forwarded to `useLogin`. */
  onSuccess?: () => void;
  /** Tighter brand-header padding for modal embedding. */
  compact?: boolean;
}

/**
 * Self-contained veteran login form. Owns its own state via `useLogin`,
 * renders the brand header and the active step (phone → OTP). Drop into
 * any container — the layout (modal chrome etc.) is the caller's job.
 */
export function LoginCard({ onSuccess, compact = false }: LoginCardProps) {
  const ctl = useLogin({ onSuccess });
  return (
    <>
      <BrandHeader mode={ctl.mode} fullPhone={ctl.fullPhone} compact={compact} />
      <FormBody ctl={ctl} />
    </>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────

export function BrandHeader({
  mode,
  fullPhone,
  compact,
}: {
  mode: Mode;
  fullPhone: string;
  compact?: boolean;
}) {
  const Icon = mode === "code" ? ShieldCheckIcon : PhoneIcon;
  const title = mode === "code" ? COPY.codeTitle : COPY.phoneTitle;
  const subtitle = mode === "code" ? COPY.codeSub(fullPhone) : COPY.phoneSub;
  const dim = compact ? 56 : 64;
  const iconSize = compact ? 26 : 30;

  return (
    <>
      <div className={compact ? "mb-3 flex justify-center" : "mt-3 mb-4 flex justify-center"}>
        <div
          className="flex items-center justify-center rounded-[20px] text-white"
          style={{
            height: dim,
            width: dim,
            background:
              "linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-ink) 100%)",
            boxShadow: "0 8px 24px rgba(31,77,52,0.22)",
          }}
        >
          <Icon size={iconSize} stroke="currentColor" sw={1.8} />
        </div>
      </div>
      <h1
        className="text-text m-0 text-center"
        style={{
          fontSize: compact ? 22 : 24,
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      <p
        className="text-text2 mx-0 mb-6 mt-2.5 text-center"
        style={{ fontSize: 15, lineHeight: 1.5 }}
      >
        {subtitle}
      </p>
    </>
  );
}

export function FormBody({ ctl }: { ctl: LoginCtl }) {
  return ctl.mode === "code" ? <CodeStep ctl={ctl} /> : <PhoneStep ctl={ctl} />;
}

function PhoneStep({ ctl }: { ctl: LoginCtl }) {
  return (
    <div className="flex flex-col gap-3">
      <PhoneField
        value={ctl.localPhone}
        onChange={ctl.setLocalPhone}
        onSubmit={ctl.requestOtp}
        disabled={ctl.busy}
      />
      <Btn
        kind="primary"
        size="lg"
        fullWidth
        onClick={ctl.requestOtp}
        disabled={ctl.busy || !ctl.phoneValid}
        loading={ctl.busy}
      >
        {ctl.busy ? "Надсилаємо…" : "Отримати код"}
      </Btn>
      <Status hint={ctl.hint} error={ctl.error} />
    </div>
  );
}

function CodeStep({ ctl }: { ctl: LoginCtl }) {
  return (
    <div className="flex flex-col gap-3.5">
      <OtpField
        value={ctl.code}
        onChange={ctl.setCode}
        onComplete={(v) => ctl.verifyOtp(v)}
        disabled={ctl.busy}
      />
      <Btn
        kind="primary"
        size="lg"
        fullWidth
        onClick={() => ctl.verifyOtp()}
        disabled={ctl.busy || !ctl.codeValid}
        loading={ctl.busy}
      >
        {ctl.busy ? "Перевіряємо…" : "Увійти"}
      </Btn>
      <ResendRow ctl={ctl} />
      <button
        type="button"
        onClick={ctl.goPhone}
        className="text-text2 self-center"
        style={{ fontSize: 13 }}
      >
        ← Змінити номер
      </button>
      <Status hint={ctl.hint} error={ctl.error} />
    </div>
  );
}

function ResendRow({ ctl }: { ctl: LoginCtl }) {
  const canResend = ctl.resendIn === 0 && !ctl.busy;
  return (
    <div
      className="flex items-center justify-center gap-1.5 text-center"
      style={{ fontSize: 13 }}
    >
      <span className="text-text2">Не отримав код?</span>
      <button
        type="button"
        onClick={ctl.requestOtp}
        disabled={!canResend}
        className="text-primary-ink disabled:text-text-muted disabled:cursor-not-allowed"
        style={{ fontWeight: 600, letterSpacing: "-0.005em" }}
      >
        {canResend ? "Надіслати ще раз" : `Ще раз за ${ctl.resendIn}с`}
      </button>
    </div>
  );
}

function Status({ hint, error }: { hint: string | null; error: string | null }) {
  if (!hint && !error) return null;
  return (
    <div className="mt-1 flex flex-col items-center gap-1 text-center">
      {error ? (
        <p
          className="m-0"
          role="alert"
          style={{ fontSize: 13, color: "#C04848", letterSpacing: "-0.005em" }}
        >
          {error}
        </p>
      ) : null}
      {hint ? (
        <p
          className="text-text-muted m-0"
          style={{ fontSize: 12, lineHeight: 1.4 }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ─── Inputs ───────────────────────────────────────────────────────────

function PhoneField({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  // Strip everything except digits and cap at the local-number length
  // so the +380 prefix can never be edited away.
  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D+/g, "").slice(0, LOCAL_PHONE_LEN);
    onChange(digits);
  };

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
        Номер телефону
      </span>
      <div
        className={
          "border-border-soft focus-within:border-primary-ink flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors"
        }
      >
        <span
          className="border-border-soft text-text2 flex items-center gap-1.5 border-r bg-[#FAFAF7] px-3.5"
          style={{ fontSize: 16, letterSpacing: "-0.005em", fontWeight: 500 }}
        >
          <PhoneIcon size={16} sw={1.8} />
          <span className="text-text">{PHONE_PREFIX}</span>
        </span>
        <input
          type="tel"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
            // Allow pasting full +380XXXXXXXXX or 380XXXXXXXXX or 0XXXXXXXXX.
            const text = e.clipboardData.getData("text");
            if (!text) return;
            e.preventDefault();
            let digits = text.replace(/\D+/g, "");
            if (digits.startsWith("380")) digits = digits.slice(3);
            else if (digits.startsWith("0")) digits = digits.slice(1);
            handleChange(digits);
          }}
          placeholder="50 123 4567"
          inputMode="numeric"
          autoComplete="tel-national"
          disabled={disabled}
          className="text-text flex-1 bg-white px-3 py-3 focus:outline-none"
          style={{ fontSize: 16, letterSpacing: "0.01em" }}
        />
      </div>
    </label>
  );
}

function OtpField({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
}) {
  // Render `OTP_LEN` independent <input>s so virtual keyboards on iOS
  // and Android show the SMS one-time-code chip on each box and so the
  // browser can autofill the code from a notification.
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  // Re-focus the active box whenever the value shrinks (e.g. on error
  // we clear the code so the user can retry without re-tabbing).
  useEffect(() => {
    if (disabled) return;
    const idx = Math.min(value.length, OTP_LEN - 1);
    refs.current[idx]?.focus();
  }, [disabled, value.length]);

  const setAt = (i: number, ch: string) => {
    const digit = ch.replace(/\D+/g, "").slice(-1);
    const next = (value.padEnd(OTP_LEN, " ").split("") as string[]);
    next[i] = digit || " ";
    const joined = next.join("").replace(/\s+$/g, "").trimEnd();
    const cleaned = joined.replace(/\s/g, "");
    onChange(cleaned);
    if (digit && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
    if (cleaned.length === OTP_LEN) onComplete(cleaned);
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = value.split("");
        next[i] = "";
        onChange(next.join(""));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
        const next = value.split("");
        next[i - 1] = "";
        onChange(next.join(""));
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && i < OTP_LEN - 1) {
      refs.current[i + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D+/g, "").slice(0, OTP_LEN);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    if (text.length === OTP_LEN) onComplete(text);
    else refs.current[text.length]?.focus();
  };

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend
        className="text-text-muted mb-0.5"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Код з SMS
      </legend>
      <div className="flex items-center justify-between gap-2">
        {Array.from({ length: OTP_LEN }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Цифра ${i + 1}`}
            value={value[i] ?? ""}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            className="border-border-soft text-text h-[54px] w-full max-w-[52px] flex-1 rounded-xl border bg-white text-center transition-colors focus:border-[color:var(--color-primary-ink)] focus:outline-none"
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function toMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Невірний код або номер.";
    if (e.status === 429) return "Забагато спроб. Спробуй за хвилину.";
    return e.message || "Сталась помилка";
  }
  if (e instanceof Error) return e.message;
  return "Сталась помилка";
}
