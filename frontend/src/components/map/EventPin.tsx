"use client";

import type { CSSProperties } from "react";

type PinColor = "green" | "blue" | "amber";

const COLOR: Record<PinColor, string> = {
  green: "#34D399",
  blue:  "#60A5FA",
  amber: "#F59E0B",
};

export interface EventPinProps {
  color: PinColor;
  count: number;
  empty?: boolean;
  focused?: boolean;
  big?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

/**
 * The teardrop-shaped event pin from the prototype. Uses two stacked layers:
 * an outer rotated drop shape and an inner unrotated counter.
 *
 * - `empty`   hollow pin with "+" (Будь першим)
 * - `focused` lifts to a stronger shadow and z-index
 * - `big`     enlarges to 44px (used on selection / detail mini-map)
 */
export function EventPin({
  color,
  count,
  empty = false,
  focused = false,
  big = false,
  ariaLabel,
  onClick,
}: EventPinProps) {
  const c = COLOR[color];
  const size = big || focused ? 44 : 36;

  const containerStyle: CSSProperties = {
    position: "relative",
    width: size + 16,
    height: size + 16,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    cursor: onClick ? "pointer" : "default",
    filter: focused
      ? "drop-shadow(0 6px 14px rgba(0,0,0,0.18))"
      : "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
    zIndex: focused ? 5 : 1,
    background: "transparent",
    border: "none",
    padding: 8,
  };

  const dropStyle: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    borderRadius: "50% 50% 50% 0",
    transform: "rotate(-45deg)",
    background: empty ? "#fff" : c,
    border: empty ? `2px solid ${c}` : "3px solid #fff",
    boxSizing: "border-box",
    pointerEvents: "none",
  };

  const labelStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: "rotate(45deg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: empty ? c : "#fff",
    fontFamily: "var(--font-sans)",
    fontSize: big ? 15 : 13,
    fontWeight: 700,
    paddingBottom: 6,
  };

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      style={containerStyle}
    >
      <span style={dropStyle}>
        <span style={labelStyle}>{empty ? "+" : count}</span>
      </span>
    </Wrapper>
  );
}
