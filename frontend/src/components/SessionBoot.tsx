"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  gateFor,
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
 *
 * Also enforces the verification gate: a session that's no longer
 * `ok` (account got blocked, status revoked, never finished verification)
 * is bounced back to `/login`. We deliberately skip this when already on
 * `/login` so the wizard can drive its own state.
 */
export function SessionBoot() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!accessToken) {
      useInvitationsStore.getState().reset();
      return;
    }
    void (async () => {
      const veteran = await refreshMe();
      void hydrateMyRegistrations();
      void useInvitationsStore.getState().hydrate();

      // Gate check after `/me` lands so we react to admin-side changes
      // (block, revoke, manual approval) on app reload.
      if (pathname?.startsWith("/login")) return;
      const role = useAuthStore.getState().role;
      const gate = gateFor(veteran, role);
      if (gate !== "ok") {
        router.replace("/login");
      }
    })();
  }, [accessToken, pathname, router]);

  return null;
}
