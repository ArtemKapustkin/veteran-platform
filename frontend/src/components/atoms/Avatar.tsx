import type { CSSProperties } from "react";

export type AvatarTone = "sand" | "green" | "blue" | "rose" | "cream" | "sage" | "dark";

const PALETTE: Record<AvatarTone, string> = {
  sand:  "#D9C5A8",
  green: "#A6CFB5",
  blue:  "#A8C2DD",
  rose:  "#D9B6B0",
  cream: "#D9CAA9",
  sage:  "#B5C2A0",
  dark:  "#3a3a3a",
};

export function Avatar({
  initial,
  tone = "sand",
  size = 28,
  ring = "#fff",
  style,
}: {
  initial: string;
  tone?: AvatarTone;
  size?: number;
  ring?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: PALETTE[tone],
        color: "#3a230b",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        fontWeight: 600,
        boxShadow: `0 0 0 2px ${ring}`,
        flex: "0 0 auto",
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
