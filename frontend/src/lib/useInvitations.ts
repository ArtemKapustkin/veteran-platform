"use client";

import { create } from "zustand";
import {
  ApiError,
  meApi,
  type Invitation,
  type Registration,
} from "./api";
import { useAuthStore, useEventsStore } from "./store";

// Pending invitations cache. Hydrated from /me/invitations after sign-in
// (see SessionBoot) and after every confirm / decline so the badge,
// account section, and event-detail banner all stay in sync without each
// surface having to repeat the round-trip.
//
// Not persisted: invitations are short-lived (24h server-side TTL) and
// the backend is the source of truth. A stale localStorage row would
// just confuse a returning user.

interface InvitationsState {
  items: Invitation[];
  loading: boolean;
  loaded: boolean;

  /** Idempotent: safe to call from boot. No-ops without a session. */
  hydrate: () => Promise<void>;
  /** Force a re-fetch. Used after confirm/decline error paths. */
  refresh: () => Promise<void>;

  /** Accept an invitation. Removes it locally and pushes the resulting
   *  Registration into the events store so the heart updates instantly. */
  confirm: (invitationId: string) => Promise<Registration>;
  /** Decline an invitation. Removes it locally; backend cancels the
   *  whole group registration, releasing the seats. */
  decline: (invitationId: string) => Promise<void>;

  /** Find a pending invitation by event id (for the EventDetail banner). */
  getForEvent: (eventId: string) => Invitation | undefined;

  reset: () => void;
}

async function fetchItems(): Promise<Invitation[]> {
  const res = await meApi.invitations();
  return res.items ?? [];
}

export const useInvitationsStore = create<InvitationsState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,

  hydrate: async () => {
    if (!useAuthStore.getState().isAuthenticated()) return;
    if (get().loading) return;
    set({ loading: true });
    try {
      const items = await fetchItems();
      set({ items, loaded: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearSession();
      }
    } finally {
      set({ loading: false });
    }
  },

  refresh: async () => {
    if (!useAuthStore.getState().isAuthenticated()) return;
    set({ loading: true });
    try {
      const items = await fetchItems();
      set({ items, loaded: true });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        useAuthStore.getState().clearSession();
      }
    } finally {
      set({ loading: false });
    }
  },

  confirm: async (invitationId) => {
    const reg = await meApi.confirmInvitation(invitationId);
    set((s) => ({
      items: s.items.filter((i) => i.id !== invitationId),
    }));
    // Reflect the accepted registration so the heart + "Ти йдеш" appear
    // immediately on every screen (account, event detail, sheet).
    useEventsStore.getState().applyRegistration(reg);
    return reg;
  },

  decline: async (invitationId) => {
    await meApi.declineInvitation(invitationId);
    set((s) => ({
      items: s.items.filter((i) => i.id !== invitationId),
    }));
  },

  getForEvent: (eventId) =>
    get().items.find(
      (i) => i.event?.id === eventId && i.status === "pending",
    ),

  reset: () => set({ items: [], loaded: false, loading: false }),
}));
