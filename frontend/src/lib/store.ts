"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  ApiError,
  authApi,
  eventsApi,
  meApi,
  setTokenProvider,
  type AuthTokens,
  type AuthTokensVeteran,
  type Registration,
  type Veteran,
} from "./api";

// ─── Auth ─────────────────────────────────────────────────────
//
// Tokens + the resolved veteran profile. Persisted to localStorage so a
// reload doesn't kick the user out. The access token is wired into the
// fetch client via `setTokenProvider` below; the refresh token is held
// for the rare cases the access token expires mid-session.

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  /** Unix ms at which the current access token expires. */
  tokenExpiresAt: number | null;
  role: "veteran" | "admin" | null;
  veteran: Veteran | null;

  setSession: (tokens: AuthTokens & { veteran?: Veteran }) => void;
  setVeteran: (veteran: Veteran | null) => void;
  clearSession: () => void;
  /** Whether the persisted session looks valid (token not yet expired). */
  isAuthenticated: () => boolean;
  /** Convenience for components that just need a guard. */
  loggedIn: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      role: null,
      veteran: null,
      loggedIn: false,

      setSession: (tokens) => {
        const expiresAt =
          Date.now() + Math.max(0, (tokens.expires_in ?? 0) - 30) * 1000;
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt: expiresAt,
          role: tokens.role,
          veteran: tokens.veteran ?? get().veteran,
          loggedIn: true,
        });
      },
      setVeteran: (veteran) => set({ veteran }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          role: null,
          veteran: null,
          loggedIn: false,
        }),
      isAuthenticated: () => {
        const { accessToken, tokenExpiresAt } = get();
        if (!accessToken) return false;
        if (tokenExpiresAt && tokenExpiresAt < Date.now()) return false;
        return true;
      },
    }),
    {
      name: "svoi:auth",
      storage: createJSONStorage(() => localStorage),
      // Re-derive `loggedIn` from the persisted token on hydrate — guards
      // against stale `loggedIn: true` after manual localStorage edits or
      // backend-side revocation.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const ok = !!state.accessToken &&
          (!state.tokenExpiresAt || state.tokenExpiresAt > Date.now());
        state.loggedIn = ok;
        if (!ok) {
          state.accessToken = null;
          state.refreshToken = null;
          state.tokenExpiresAt = null;
          state.role = null;
        }
      },
    },
  ),
);

// Wire the API client to read the current token from the store. Done at
// module load so any subsequent `api.*` call sees the right header.
setTokenProvider(() => useAuthStore.getState().accessToken);

// ─── Auth actions (free functions — easier to reuse from screens) ───

export async function loginWithOtp(
  phone: string,
  code: string,
): Promise<AuthTokensVeteran> {
  const tokens = await authApi.verifyOtp(phone, code);
  useAuthStore.getState().setSession(tokens);
  // Hydrate registrations so the RSVP heart shows up immediately.
  void hydrateMyRegistrations();
  return tokens;
}

export async function loginAsAdmin(
  email: string,
  password: string,
): Promise<AuthTokens> {
  const tokens = await authApi.adminLogin(email, password);
  useAuthStore.getState().setSession(tokens);
  // Admin doesn't have a /me veteran profile in the same shape, but the
  // /me endpoint still works (the bootstrap admin row is in `vp.veterans`).
  try {
    const veteran = await meApi.get();
    useAuthStore.getState().setVeteran(veteran);
  } catch {
    /* admin /me may 401 in some configurations; non-fatal */
  }
  return tokens;
}

export async function logoutCurrentUser(): Promise<void> {
  const refresh = useAuthStore.getState().refreshToken;
  useAuthStore.getState().clearSession();
  useEventsStore.getState().reset();
  if (refresh) {
    try {
      await authApi.logout(refresh);
    } catch {
      /* logout failures are non-fatal */
    }
  }
}

/**
 * Fetch the current veteran profile and store it. Called from app boot so
 * the account screen has fresh data on reload, and after any verification
 * status change.
 */
export async function refreshMe(): Promise<Veteran | null> {
  if (!useAuthStore.getState().isAuthenticated()) return null;
  try {
    const veteran = await meApi.get();
    useAuthStore.getState().setVeteran(veteran);
    return veteran;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return null;
  }
}

// ─── Events store ────────────────────────────────────────────
//
// Holds the user's RSVP/saved sets plus a tiny cache of registrations
// keyed by event ID so the RSVP heart can show "Я йду" + cancel without
// waiting on /me/registrations to round-trip.

interface EventsState {
  /** Event IDs the current user has confirmed (or pending) registration on. */
  rsvpIds: string[];
  /** Registration record for each rsvp event id (for cancellation). */
  registrations: Record<string, Registration>;
  /** Locally-saved (heart) event IDs — purely client-side bookmark list. */
  savedIds: string[];

  isRsvp: (id: string) => boolean;
  isSaved: (id: string) => boolean;

  toggleSaved: (id: string) => void;

  /**
   * Toggle RSVP via the backend. Resolves once the registration has been
   * created (solo) or cancelled. Throws on network / quota errors so the
   * caller can show feedback.
   */
  setRsvp: (eventId: string, on: boolean) => Promise<void>;

  /** Hydrate `rsvpIds` + `registrations` from /me/registrations. */
  hydrate: () => Promise<void>;

  reset: () => void;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      rsvpIds: [],
      registrations: {},
      savedIds: [],

      isRsvp: (id) => get().rsvpIds.includes(id),
      isSaved: (id) => get().savedIds.includes(id),

      toggleSaved: (id) =>
        set((s) => ({
          savedIds: s.savedIds.includes(id)
            ? s.savedIds.filter((x) => x !== id)
            : [...s.savedIds, id],
        })),

      setRsvp: async (eventId, on) => {
        const auth = useAuthStore.getState();
        if (!auth.isAuthenticated()) {
          // Without a session the registration call would 401 — fall back
          // to a client-only optimistic flag so guests can mark intent and
          // the caller can prompt for login.
          set((s) => ({
            rsvpIds: on
              ? Array.from(new Set([...s.rsvpIds, eventId]))
              : s.rsvpIds.filter((x) => x !== eventId),
            savedIds:
              on && !s.savedIds.includes(eventId)
                ? [...s.savedIds, eventId]
                : s.savedIds,
          }));
          return;
        }

        if (on) {
          const reg = await eventsApi.register(eventId, { seats: 1 });
          set((s) => ({
            rsvpIds: Array.from(new Set([...s.rsvpIds, eventId])),
            registrations: { ...s.registrations, [eventId]: reg },
            savedIds: s.savedIds.includes(eventId)
              ? s.savedIds
              : [...s.savedIds, eventId],
          }));
        } else {
          const existing = get().registrations[eventId];
          if (existing) {
            try {
              await eventsApi.cancelRegistration(eventId, existing.id);
            } catch (e) {
              if (!(e instanceof ApiError) || e.status !== 404) throw e;
            }
          }
          set((s) => {
            const next = { ...s.registrations };
            delete next[eventId];
            return {
              rsvpIds: s.rsvpIds.filter((x) => x !== eventId),
              registrations: next,
            };
          });
        }
      },

      hydrate: async () => {
        if (!useAuthStore.getState().isAuthenticated()) return;
        try {
          const page = await meApi.registrations({ limit: 100 });
          const active = page.items.filter(
            (r) => r.status === "confirmed" || r.status === "pending_companions",
          );
          const map: Record<string, Registration> = {};
          for (const r of active) map[r.event_id] = r;
          set({
            rsvpIds: active.map((r) => r.event_id),
            registrations: map,
          });
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            useAuthStore.getState().clearSession();
          }
        }
      },

      reset: () => set({ rsvpIds: [], registrations: {} }),
    }),
    {
      name: "svoi:events",
      storage: createJSONStorage(() => localStorage),
      // `savedIds` is the only thing worth persisting client-side; the
      // RSVP set is authoritative on the backend.
      partialize: (s) => ({ savedIds: s.savedIds }),
    },
  ),
);

/**
 * Convenience: refresh the registrations cache. Called from app boot and
 * after any RSVP-related navigation (e.g. landing on /saved).
 */
export async function hydrateMyRegistrations(): Promise<void> {
  await useEventsStore.getState().hydrate();
}

// ─── Accessibility prefs (unchanged behaviour) ──────────────

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
