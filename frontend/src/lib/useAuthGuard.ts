"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/store";

interface RequireAuthOpts {
  /**
   * Optional second-line copy explaining what triggered the prompt. The
   * hint is currently dropped (we redirect to a full page where the
   * context is implicit), but the parameter is kept so callers don't
   * have to change. We can revive it as a `?hint=` query param if /login
   * grows a banner slot.
   */
  hint?: string;
}

/**
 * Imperative auth gate for components. Returns a function that, on each
 * call, returns `true` when the user has a valid session and `false`
 * otherwise. The `false` branch redirects to `/login?next=<current url>`
 * so the user can finish what they were doing after sign-in.
 *
 *   const requireAuth = useAuthGuard();
 *   if (!requireAuth({ hint: "Щоб зберегти подію" })) return;
 *
 * Reads auth synchronously from the Zustand store rather than
 * subscribing — we don't need to re-render when auth changes, only at
 * the moment of the action.
 */
export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (opts?: RequireAuthOpts): boolean => {
      void opts; // hint currently unused — kept for API compatibility
      if (useAuthStore.getState().isAuthenticated()) return true;
      // Round-trip the user back to whatever they tapped on, including
      // any active query string (e.g. `?event=…` overlays).
      const qs = searchParams?.toString();
      const here = qs ? `${pathname}?${qs}` : pathname;
      router.push(`/login?next=${encodeURIComponent(here || "/")}`);
      return false;
    },
    [pathname, router, searchParams],
  );
}
