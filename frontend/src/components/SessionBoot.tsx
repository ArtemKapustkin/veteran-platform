"use client";

import { useEffect } from "react";
import {
  hydrateMyRegistrations,
  refreshMe,
  useAuthStore,
} from "@/lib/store";

/**
 * Runs once on the client after Zustand has rehydrated from localStorage.
 * Pulls a fresh `/me` (so a server-side block / verification update lands
 * in the UI) and re-syncs the user's registrations cache. Both calls
 * silently no-op when the user isn't authenticated.
 */
export function SessionBoot() {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;
    void refreshMe();
    void hydrateMyRegistrations();
  }, [accessToken]);

  return null;
}
