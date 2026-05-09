import type { CSSProperties, ReactNode } from "react";

export type PillColor =
  | "sand"
  | "green"
  | "blue"
  | "amber"
  | "rose"
  | "grey"
  | "dark";

const PALETTE: Record<PillColor, { bg: string; fg: string }> = {
  sand:  { bg: "#F5E9D9", fg: "#7A4F22" },
  green: { bg: "#E5F4EB", fg: "#1F7E50" },
  blue:  { bg: "#E1ECFB", fg: "#2456A6" },
  amber: { bg: "#FEF3C7", fg: "#92400E" },
  rose:  { bg: "#FBE8E8", fg: "#9B3D3D" },
  grey:  { bg: "#F1F2F4", fg: "#4B5563" },
  dark:  { bg: "#1A1A1A", fg: "#FFFFFF" },
};

export function Pill({
  children,
  color = "sand",
  style,
}: {
  children: ReactNode;
  color?: PillColor;
  style?: CSSProperties;
}) {
  const c = PALETTE[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-none"
      style={{ background: c.bg, color: c.fg, ...style }}
    >
      {children}
    </span>
  );
}
