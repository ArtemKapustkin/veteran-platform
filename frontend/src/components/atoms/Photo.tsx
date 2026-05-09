import type { CSSProperties } from "react";

export type PhotoTone = "sand" | "green" | "blue" | "rose" | "cream" | "sage";

const PALETTE: Record<PhotoTone, [string, string]> = {
  sand:  ["#E8DAC4", "#D9C5A8"],
  green: ["#D5E1C9", "#BACBA4"],
  blue:  ["#CBD8E3", "#AFC2D2"],
  rose:  ["#E6CFCB", "#D2AEAA"],
  cream: ["#EFE6D2", "#DDD0B5"],
  sage:  ["#D7DECB", "#BAC4A8"],
};

export function Photo({
  tone = "sand",
  label,
  height = 180,
  radius = 16,
  fill = false,
  className,
  style,
  alt,
}: {
  tone?: PhotoTone;
  label?: string;
  height?: number | string;
  radius?: number;
  /** Fill the parent (position: absolute, inset: 0). Useful for cards with aspect-ratio. */
  fill?: boolean;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}) {
  const [a, b] = PALETTE[tone];
  return (
    <div
      role="img"
      aria-label={alt ?? label ?? "Обкладинка події"}
      className={className}
      style={{
        width: fill ? undefined : "100%",
        height: fill ? undefined : height,
        borderRadius: radius,
        position: fill ? "absolute" : "relative",
        inset: fill ? 0 : undefined,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(115deg, transparent 0 22px, rgba(255,255,255,0.18) 22px 23px)",
        }}
      />
      {label ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 12,
            bottom: 10,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontSize: 10,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgba(58,35,11,0.6)",
            background: "rgba(255,255,255,0.55)",
            padding: "3px 7px",
            borderRadius: 4,
            backdropFilter: "blur(4px)",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
