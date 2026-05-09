"use client";

import { useSyncExternalStore } from "react";

export const DESKTOP_BREAKPOINT = 1024;

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

const getSnapshot = () =>
  typeof window !== "undefined" &&
  window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches;

const getServerSnapshot = () => false;

/**
 * `true` when the viewport is at least 1024px (LUN-style split view threshold).
 *
 * SSR-safe: server and first client render both return `false`, then the hook
 * re-runs on mount with the real value. Pages call this to switch between the
 * mobile single-column layout and the desktop top-nav + cards-grid + map shell.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
