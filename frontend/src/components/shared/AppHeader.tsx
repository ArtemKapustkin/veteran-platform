"use client";

import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/atoms/Avatar";
import { UserIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

/**
 * Mobile top chrome — logo on the left, account chip on the right.
 *
 * The accessibility entry point lives in `BottomToolbar` ("Доступність") instead
 * of the header so the header stays focused on identity (who am I logged
 * in as?) while the bottom nav owns global utilities.
 *
 * The chip always links to `/account`. Logged-in users see their initials
 * (e.g. "ІП" for "Іван Петренко") plus their first name; guests see a
 * generic user icon + "Увійти", and `/account` falls through to
 * `AccountGuest` which prompts the SMS login flow.
 */
export function AppHeader() {
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const veteran = useAuthStore((s) => s.veteran);
  const role = useAuthStore((s) => s.role);
  // Defer the auth-derived UI until after hydration so SSR and the first
  // client paint stay in sync (matches BottomToolbar's pattern).
  const isLoggedIn = mounted && loggedIn;

  const fullName =
    (isLoggedIn && veteran?.fullname?.trim()) ||
    (isLoggedIn && role === "admin" ? "Адмін" : "");
  const firstName = fullName ? fullName.split(/\s+/u)[0] : "";
  const initials = fullName
    ? fullName
        .split(/\s+/u)
        .filter(Boolean)
        .slice(0, 2)
        .map((tok) => tok.charAt(0).toUpperCase())
        .join("") || "С"
    : "";

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <Link
        href="/map"
        className="flex items-center outline-none"
        aria-label="Свої поруч — на головну"
      >
        <Image
          src="/logo.png"
          alt="Свої поруч"
          width={500}
          height={120}
          priority
          sizes="140px"
          style={{ height: 28, width: "auto" }}
        />
      </Link>

      {isLoggedIn ? (
        <Link
          href="/account"
          aria-label={firstName ? `Мій акаунт — ${firstName}` : "Мій акаунт"}
          className={
            firstName
              ? "flex items-center gap-2 rounded-full py-1 pl-1 pr-3 active:brightness-95"
              : "flex items-center rounded-full px-1 py-1 active:brightness-95"
          }
          style={{ background: "#F8F6F1" }}
        >
          <Avatar initial={initials} tone="sand" size={28} ring="#F8F6F1" />
          {firstName ? (
            <span
              className="text-text max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "-0.005em",
              }}
            >
              {firstName}
            </span>
          ) : null}
        </Link>
      ) : (
        <Link
          href="/account"
          aria-label="Увійти в акаунт"
          className="border-primary bg-primary-soft text-primary-ink flex h-11 items-center gap-1.5 rounded-full border-2 pl-2.5 pr-3.5 shadow-soft active:brightness-95"
          style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}
        >
          <UserIcon size={18} />
          <span>Увійти</span>
        </Link>
      )}
    </div>
  );
}
