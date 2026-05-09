"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Kind = "primary" | "invite" | "dark" | "secondary" | "ghost" | "success" | "tg";
type Size = "sm" | "md" | "lg";

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-[18px] text-[15px] gap-2 rounded-[10px]",
  lg: "h-[52px] px-[22px] text-base gap-2.5 rounded-xl",
};

const KIND: Record<Kind, { className: string; style?: CSSProperties }> = {
  primary: {
    className:
      "bg-primary text-white shadow-[0_1px_2px_rgba(31,77,52,0.22)] hover:brightness-[1.04] active:brightness-95",
  },
  invite: {
    className:
      "bg-invite text-white shadow-[0_6px_16px_rgba(63,127,98,0.28),0_1px_2px_rgba(31,77,52,0.18)] hover:brightness-[1.05] active:brightness-95",
  },
  dark: {
    className:
      "bg-[#1A1A1A] text-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:bg-[#2A2A2A]",
  },
  secondary: {
    className:
      "bg-white text-text border border-border hover:bg-bg/60",
  },
  ghost: {
    className: "bg-transparent text-text hover:bg-black/5",
  },
  success: {
    className:
      "bg-[#E8F6EF] text-[#0E6E45] border border-[#BFE7CF]",
  },
  tg: {
    className:
      "bg-[#229ED9] text-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:brightness-105",
  },
};

export interface BtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  kind?: Kind;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  asLink?: boolean;
  type?: "button" | "submit";
}

export function Btn({
  children,
  kind = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth,
  className,
  asLink,
  type = "button",
  ...rest
}: BtnProps) {
  const style: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    ...(KIND[kind].style ?? {}),
  };

  const classes = cn(
    "inline-flex items-center justify-center select-none transition-[filter,background-color] duration-150",
    SIZE[size],
    KIND[kind].className,
    fullWidth && "w-full",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "cursor-pointer",
    className,
  );

  if (asLink) {
    // Caller wraps with <Link>; render a span that LOOKS like a button so we
    // don't nest <a><button>. The <Link> provides interactivity.
    return (
      <span className={classes} style={style} role="presentation">
        {icon}
        {children}
        {iconRight}
      </span>
    );
  }

  return (
    <button type={type} className={classes} style={style} {...rest}>
      {icon}
      {children}
      {iconRight}
    </button>
  );
}
