"use client";

import { create } from "zustand";

// Single-active-toast store. Most apps stack multiple toasts; ours
// surfaces RSVP/share/cancel feedback that always supersedes the
// previous message — queueing would just make the user wait through
// stale notifications. Calling `show()` while another toast is visible
// replaces it (and resets the auto-dismiss timer).

export type ToastKind = "success" | "error" | "info";

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional secondary line shown beneath `message` in slightly muted text. */
  hint?: string;
  /** Auto-dismiss timeout in ms. Pass 0 for sticky. Default 3000. */
  durationMs: number;
}

interface ToastState {
  current: Toast | null;
  show: (input: {
    kind: ToastKind;
    message: string;
    hint?: string;
    durationMs?: number;
  }) => number;
  dismiss: (id?: number) => void;
}

let nextId = 1;
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  show: ({ kind, message, hint, durationMs = 3000 }) => {
    const id = nextId++;
    clearTimer();
    set({ current: { id, kind, message, hint, durationMs } });
    if (durationMs > 0) {
      dismissTimer = setTimeout(() => {
        // Only auto-dismiss if no newer toast has replaced this one.
        if (get().current?.id === id) set({ current: null });
      }, durationMs);
    }
    return id;
  },
  dismiss: (id) => {
    const cur = get().current;
    if (cur && (id == null || cur.id === id)) {
      clearTimer();
      set({ current: null });
    }
  },
}));

/** Convenience helpers — slightly nicer at call sites than `show({...})`. */
export const toast = {
  success: (message: string, hint?: string) =>
    useToastStore.getState().show({ kind: "success", message, hint }),
  error: (message: string, hint?: string) =>
    useToastStore.getState().show({ kind: "error", message, hint, durationMs: 4500 }),
  info: (message: string, hint?: string) =>
    useToastStore.getState().show({ kind: "info", message, hint }),
};
