"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns `false` on the server / first client render and `true` after mount.
 * Use to avoid SSR/CSR mismatches when reading from localStorage-backed
 * Zustand stores (rsvp / saved / a11y prefs).
 *
 * Implemented with `useSyncExternalStore` so it satisfies the React 19
 * `react-hooks/set-state-in-effect` rule without ad-hoc effects.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
