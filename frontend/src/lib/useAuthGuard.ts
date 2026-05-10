"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/lib/store";
import { useLoginPromptStore } from "@/lib/useLoginPrompt";

interface RequireAuthOpts {
  /** Optional second-line copy explaining what triggered the prompt. */
  hint?: string;
}

/**
 * Imperative auth gate for components. Returns a function that, on each
 * call, returns `true` when the user has a valid session and `false`
 * otherwise. The `false` branch opens the global `LoginPromptDialog`
 * with an optional `hint` so callers don't each have to repeat the copy.
 *
 *   const requireAuth = useAuthGuard();
 *   if (!requireAuth({ hint: "Щоб зберегти подію" })) return;
 *
 * Reads auth synchronously from the Zustand store rather than
 * subscribing — we don't need to re-render when auth changes, only at
 * the moment of the action. This keeps the hook trivially cheap.
 */
export function useAuthGuard() {
  return useCallback((opts?: RequireAuthOpts): boolean => {
    if (useAuthStore.getState().isAuthenticated()) return true;
    useLoginPromptStore.getState().open(opts?.hint);
    return false;
  }, []);
}
