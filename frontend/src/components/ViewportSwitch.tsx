"use client";

import type { ReactNode } from "react";
import { useIsDesktop } from "@/lib/useIsDesktop";

/**
 * Render the mobile or desktop layout depending on viewport.
 *
 * Server and first client render show `mobile`. The desktop tree mounts only
 * after `useIsDesktop` flips on (≥1024 px). This avoids hydration mismatches
 * and prevents two MapLibre instances from initializing on different
 * viewports.
 */
export function ViewportSwitch({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  return <>{isDesktop ? desktop : mobile}</>;
}
