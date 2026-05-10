"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BackIcon } from "@/components/icons";
import { BrandHeader, FormBody, useLogin } from "@/components/login/LoginCard";
import { gateFor, useAuthStore } from "@/lib/store";
import { DocumentUploadStep } from "./DocumentUploadStep";
import { PendingReviewStep } from "./PendingReviewStep";

// Wizard phase machine wrapping `useLogin` (which owns phone + OTP).
// The login hook fires `onSuccess` after the auth store is set, at
// which point we read the freshly-stored veteran and route to the next
// phase.
//
//   auth      → phone + OTP form (delegated to useLogin/FormBody)
//   document  → upload УБД / military doc → AI verify
//   pending   → manual review wall (admin must approve)
//
// "Approved" never gets its own phase — the user is redirected into the
// app via `?next=` (or `/`).

type Phase = "auth" | "document" | "pending";

function safeNext(raw: string | null): string {
  // Only allow same-origin path redirects so the `?next=` param can't be
  // weaponised to send users to an attacker-controlled host.
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.startsWith("/login")) return "/";
  return raw;
}

// Synchronous initial-phase decision based on the rehydrated auth store.
// Zustand's `persist` middleware rehydrates from localStorage on store
// creation, so reading from `getState()` here returns the latest known
// session for returning users.
function initialPhase(): Phase {
  if (typeof window === "undefined") return "auth";
  const { veteran, role, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated()) return "auth";
  const gate = gateFor(veteran, role);
  if (gate === "needs_review") return "pending";
  if (gate === "needs_documents") return "document";
  // gate === "ok" → user shouldn't be on /login at all; the effect
  // below redirects them out, but we still pick "auth" so a brief
  // render before the effect fires shows nothing surprising.
  return "auth";
}

function shouldRedirectOut(): boolean {
  if (typeof window === "undefined") return false;
  const { veteran, role, isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated()) return false;
  return gateFor(veteran, role) === "ok";
}

export function LoginWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [phase, setPhase] = useState<Phase>(initialPhase);
  // Hide the form briefly while we redirect a verified user back into
  // the app — without this they'd see the phone-entry flash.
  const [redirecting] = useState<boolean>(shouldRedirectOut);

  // Side-effect: bounce verified users out. No setState in here so it
  // satisfies the `react-hooks/set-state-in-effect` lint rule.
  useEffect(() => {
    if (!redirecting) return;
    router.replace(next);
  }, [redirecting, router, next]);

  // After OTP success the store has the new session. Decide where to go.
  const handleLoginSuccess = useCallback(() => {
    const { veteran, role } = useAuthStore.getState();
    const gate = gateFor(veteran, role);
    if (gate === "ok") {
      router.replace(next);
      return;
    }
    if (gate === "needs_documents") {
      setPhase("document");
      return;
    }
    setPhase("pending");
  }, [router, next]);

  const ctl = useLogin({ onSuccess: handleLoginSuccess });

  const onUploadApproved = useCallback(() => {
    router.replace(next);
  }, [router, next]);

  const onUploadRejected = useCallback(() => {
    setPhase("pending");
  }, []);

  const onPendingLogout = useCallback(() => {
    setPhase("auth");
  }, []);

  const onPendingRetry = useCallback(() => {
    setPhase("document");
  }, []);

  const onBack = useCallback(() => {
    // `router.back()` is a no-op when there's no history entry (user
    // pasted /login directly), so fall back to the home screen.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  return (
    <main
      className="bg-bg relative flex w-full flex-col px-6 pt-10 pb-8"
      style={{ minHeight: "100dvh" }}
    >
      {/* Only show the back button while the user is still pre-auth.
          Once they're signed in (document / pending phases) navigating
          away just bounces them back via SessionBoot, so each of those
          screens owns its own exit (logout / retry) instead. */}
      {!redirecting && phase === "auth" ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Назад"
          className="absolute left-4 top-4 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F2F1ED] text-[var(--color-text)] transition-colors hover:brightness-95"
        >
          <BackIcon size={20} />
        </button>
      ) : null}

      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
        {redirecting ? null : phase === "auth" ? (
          <>
            <BrandHeader mode={ctl.mode} fullPhone={ctl.fullPhone} />
            <FormBody ctl={ctl} />
          </>
        ) : phase === "document" ? (
          <DocumentUploadStep
            onApproved={onUploadApproved}
            onRejected={onUploadRejected}
          />
        ) : (
          <PendingReviewStep
            onRetry={onPendingRetry}
            onLogout={onPendingLogout}
          />
        )}
      </div>
    </main>
  );
}
