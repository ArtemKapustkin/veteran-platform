"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── RSVP / saved events ─────────────────────────────────────

interface EventsState {
  rsvpIds: number[];
  savedIds: number[];
  isRsvp: (id: number) => boolean;
  isSaved: (id: number) => boolean;
  toggleRsvp: (id: number) => void;
  toggleSaved: (id: number) => void;
  setRsvp: (id: number, on: boolean) => void;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      rsvpIds: [],
      savedIds: [],
      isRsvp: (id) => get().rsvpIds.includes(id),
      isSaved: (id) => get().savedIds.includes(id),
      toggleRsvp: (id) =>
        set((s) => ({
          rsvpIds: s.rsvpIds.includes(id)
            ? s.rsvpIds.filter((x) => x !== id)
            : [...s.rsvpIds, id],
          // RSVP implies saved (matches the draft's setSF on rsvp)
          savedIds: s.savedIds.includes(id) ? s.savedIds : [...s.savedIds, id],
        })),
      setRsvp: (id, on) =>
        set((s) => ({
          rsvpIds: on
            ? Array.from(new Set([...s.rsvpIds, id]))
            : s.rsvpIds.filter((x) => x !== id),
          savedIds: on && !s.savedIds.includes(id)
            ? [...s.savedIds, id]
            : s.savedIds,
        })),
      toggleSaved: (id) =>
        set((s) => ({
          savedIds: s.savedIds.includes(id)
            ? s.savedIds.filter((x) => x !== id)
            : [...s.savedIds, id],
        })),
    }),
    {
      name: "svoi:events",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ─── Accessibility prefs ────────────────────────────────────

export type TextSize = "sm" | "md" | "lg";

interface A11yState {
  textSize: TextSize;
  highContrast: boolean;
  reduceMotion: boolean;
  voiceInput: boolean;
  setTextSize: (s: TextSize) => void;
  setHighContrast: (v: boolean) => void;
  setReduceMotion: (v: boolean) => void;
  setVoiceInput: (v: boolean) => void;
}

const HTML_CLASS = (className: string, on: boolean) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(className, on);
};

const SET_TEXT_SIZE = (size: TextSize) => {
  if (typeof document === "undefined") return;
  document.documentElement.classList.remove(
    "text-size-sm",
    "text-size-md",
    "text-size-lg",
  );
  document.documentElement.classList.add(`text-size-${size}`);
};

export const useA11yStore = create<A11yState>()(
  persist(
    (set) => ({
      textSize: "md",
      highContrast: false,
      reduceMotion: false,
      voiceInput: true,
      setTextSize: (size) => {
        SET_TEXT_SIZE(size);
        set({ textSize: size });
      },
      setHighContrast: (v) => {
        HTML_CLASS("high-contrast", v);
        set({ highContrast: v });
      },
      setReduceMotion: (v) => {
        HTML_CLASS("reduce-motion", v);
        set({ reduceMotion: v });
      },
      setVoiceInput: (v) => set({ voiceInput: v }),
    }),
    {
      name: "svoi:a11y",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        SET_TEXT_SIZE(state.textSize);
        HTML_CLASS("high-contrast", state.highContrast);
        HTML_CLASS("reduce-motion", state.reduceMotion);
      },
    },
  ),
);
