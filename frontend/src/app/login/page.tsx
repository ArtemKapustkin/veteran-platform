"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { DragHandle } from "@/components/shared/DragHandle";
import { TgIcon } from "@/components/icons";
import { authApi, ApiError } from "@/lib/api";
import { loginAsAdmin, loginWithOtp } from "@/lib/store";

type Mode = "phone" | "code" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("+380");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const onRequestOtp = async () => {
    setError(null);
    setBusy(true);
    try {
      await authApi.requestOtp(phone.trim());
      // Twilio is stubbed in dev; the OTP gets logged to the backend
      // container. Help testers find it without forcing them to read docs.
      setHint(
        "Код надіслано (у dev-режимі дивись логи бекенду: docker compose logs backend | grep OTP)",
      );
      setMode("code");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithOtp(phone.trim(), code.trim());
      router.push("/map");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onAdmin = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginAsAdmin(email.trim(), password);
      router.push("/map");
    } catch (e) {
      setError(toMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="bg-bg relative overflow-hidden"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <div aria-hidden className="bg-map-bg absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(250,250,247,0.6) 0%, rgba(250,250,247,0.95) 60%)",
        }}
      />

      <div
        className="bg-surface absolute inset-x-0 bottom-0 box-border rounded-t-3xl px-6 pt-3.5 pb-9"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <DragHandle />
        <div className="mt-3.5 mb-4 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[20px] text-white"
            style={{
              background: "linear-gradient(180deg, #2AABEE 0%, #229ED9 100%)",
              boxShadow: "0 8px 24px rgba(34,158,217,0.28)",
            }}
          >
            <TgIcon size={30} />
          </div>
        </div>
        <h2
          className="text-text m-0 text-center"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          {mode === "admin" ? "Вхід для адмінів" : "Вхід через SMS"}
        </h2>
        <p
          className="text-text2 mx-0 mt-2.5 mb-7 text-center"
          style={{ fontSize: 15, lineHeight: 1.5 }}
        >
          {mode === "phone" ? (
            <>Введи номер — отримаєш код у SMS.</>
          ) : mode === "code" ? (
            <>Код надіслано на {phone}.</>
          ) : (
            <>Email та пароль.</>
          )}
        </p>

        {mode === "phone" ? (
          <div className="flex flex-col gap-3">
            <Field
              label="Номер телефону"
              value={phone}
              onChange={setPhone}
              placeholder="+380501234567"
              type="tel"
              autoComplete="tel"
            />
            <Btn
              kind="tg"
              size="lg"
              fullWidth
              icon={<TgIcon size={18} />}
              onClick={onRequestOtp}
              disabled={busy || phone.trim().length < 10}
            >
              {busy ? "Надсилаємо…" : "Отримати код"}
            </Btn>
          </div>
        ) : mode === "code" ? (
          <div className="flex flex-col gap-3">
            <Field
              label="Код з SMS"
              value={code}
              onChange={setCode}
              placeholder="123456"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
            />
            <Btn
              kind="primary"
              size="lg"
              fullWidth
              onClick={onVerify}
              disabled={busy || code.trim().length < 4}
            >
              {busy ? "Перевіряємо…" : "Увійти"}
            </Btn>
            <button
              type="button"
              onClick={() => setMode("phone")}
              className="text-text2 mt-1 self-center"
              style={{ fontSize: 13 }}
            >
              ← Змінити номер
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Field
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="admin@example.com"
              type="email"
              autoComplete="username"
            />
            <Field
              label="Пароль"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
            <Btn
              kind="primary"
              size="lg"
              fullWidth
              onClick={onAdmin}
              disabled={busy || !email || !password}
            >
              {busy ? "Заходимо…" : "Увійти"}
            </Btn>
          </div>
        )}

        {hint ? (
          <p
            className="text-text2 mt-3 text-center"
            style={{ fontSize: 12, lineHeight: 1.4 }}
          >
            {hint}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-3 text-center"
            style={{ fontSize: 13, color: "#C04848" }}
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setHint(null);
              setMode(mode === "admin" ? "phone" : "admin");
            }}
            className="text-text2"
            style={{ fontSize: 13 }}
          >
            {mode === "admin" ? "Я ветеран — увійти телефоном" : "Я адмін"}
          </button>
          <Link
            href="/map"
            className="text-text2 text-sm"
            style={{ letterSpacing: "-0.005em" }}
          >
            Поки що{" "}
            <u
              style={{
                textDecorationColor: "var(--color-text-muted)",
                textDecorationThickness: 1,
                textUnderlineOffset: 3,
              }}
            >
              без входу
            </u>
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
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
        {label}
      </span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="border-border-soft text-text rounded-xl border bg-white px-3.5 py-3"
        style={{ fontSize: 16, letterSpacing: "-0.005em" }}
      />
    </label>
  );
}

function toMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Невірний код або номер.";
    if (e.status === 429) return "Забагато спроб. Спробуй за хвилину.";
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return "Сталась помилка";
}
