"use client";

import { useEffect } from "react";
import {
  hydrateMyRegistrations,
  refreshMe,
  useAuthStore,
} from "@/lib/store";
import { useInvitationsStore } from "@/lib/useInvitations";

/**
 * Runs once on the client after Zustand has rehydrated from localStorage.
 * Pulls a fresh `/me` (so a server-side block / verification update lands
 * in the UI), re-syncs the registrations cache, and loads any pending
 * group-event invitations so the account section + event-detail banner
 * render with data on first paint. Each call silently no-ops when the
 * user isn't authenticated.
 */
export function SessionBoot() {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      useInvitationsStore.getState().reset();
      return;
    }
    void refreshMe();
    void hydrateMyRegistrations();
    void useInvitationsStore.getState().hydrate();
  }, [accessToken]);

  return null;
}
