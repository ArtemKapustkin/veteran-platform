import type { ReactNode } from "react";

/**
 * Mobile: a centered 440px column on a warm stage background.
 * Desktop (≥lg): the column melts away and content fills the viewport so
 * pages can render their own LUN-style top nav + split layout.
 */
export function ResponsiveStage({ children }: { children: ReactNode }) {
  return (
    <div className="bg-stage flex min-h-[100dvh] w-full items-stretch justify-center lg:bg-bg">
      <div
        className="bg-bg relative w-full max-w-[440px] overflow-hidden sm:shadow-[0_0_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] lg:max-w-none lg:overflow-visible lg:shadow-none"
        style={{ minHeight: "100dvh" }}
      >
        {children}
      </div>
    </div>
  );
}
