"use client";

import { create } from "zustand";

// Global "this action needs an account" modal. Opened from anywhere via
// `useLoginPromptStore.getState().open(...)`, rendered once by
// `<LoginPromptDialog />` in the root layout.
//
// Single-instance by design — the modal blocks the underlying surface,
// so stacking two prompts would be confusing. Re-opening with a new hint
// just replaces the message.

interface LoginPromptState {
  isOpen: boolean;
  /** Optional second-line copy explaining what the user was trying to do. */
  hint: string | null;
  open: (hint?: string) => void;
  close: () => void;
}

export const useLoginPromptStore = create<LoginPromptState>((set) => ({
  isOpen: false,
  hint: null,
  open: (hint) => set({ isOpen: true, hint: hint ?? null }),
  close: () => set({ isOpen: false }),
}));
