"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { AccessIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

function NavTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="rounded-lg px-3 py-2 transition-colors"
      style={{
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        color: active ? "var(--color-text)" : "var(--color-text2)",
        background: active ? "#F2F1ED" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}

function ComingSoonItem({ label }: { label: string }) {
  return (
    <span
      aria-disabled="true"
      className="text-text-muted flex items-center gap-1.5 rounded-lg px-3 py-2"
      style={{
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: "not-allowed",
        opacity: 0.85,
      }}
    >
      {label}
      <span
        className="text-text2"
        style={{
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 6,
          background: "#F2F1ED",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        скоро
      </span>
    </span>
  );
}

export function DesktopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const role = useAuthStore((s) => s.role);
  const veteran = useAuthStore((s) => s.veteran);
  // Default to the guest layout on SSR/first paint to avoid hydration drift
  // between server and client (the auth store is localStorage-backed).
  const isLoggedIn = mounted && loggedIn;
  const isAdmin = mounted && role === "admin";

  // Mirror the logic from `AppHeader` (mobile) so the chip shows the real
  // veteran's name + initials instead of a hardcoded placeholder.
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
    : "С";

  const onAccess = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("a11y", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  const eventsActive =
    pathname === "/map" ||
    pathname === "/list" ||
    pathname.startsWith("/events");
  const communitiesActive = pathname.startsWith("/communities");
  const savedActive = pathname === "/saved";
  const accountActive = pathname === "/account";
  const adminActive = pathname.startsWith("/admin");

  return (
    <header
      className="border-border-soft flex flex-shrink-0 items-center gap-3 border-b bg-white px-8"
      style={{ height: 64 }}
    >
      <Link
        href="/"
        className="flex items-center"
        aria-label="Свої поруч — на головну"
      >
        <Image
          src="/logo.png"
          alt="Свої поруч"
          width={500}
          height={120}
          priority
          sizes="170px"
          style={{ height: 32, width: "auto" }}
        />
      </Link>

      <nav className="ml-6 flex items-center gap-0.5" aria-label="Розділи">
        <NavTab label="Події поруч" href="/map" active={eventsActive} />
        <NavTab
          label="Спільноти поруч"
          href="/communities"
          active={communitiesActive}
        />
        <ComingSoonItem label="Акції поруч" />
        {isLoggedIn ? (
          <NavTab label="Збережені" href="/saved" active={savedActive} />
        ) : null}
        {isAdmin ? (
          <NavTab label="Адмін" href="/admin/events" active={adminActive} />
        ) : null}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onAccess}
        aria-label="Доступність — налаштування інклюзивності"
        title="Доступність"
        className="border-primary bg-primary-soft text-primary-ink flex h-11 items-center gap-2 rounded-full border-2 pl-3 pr-4 hover:brightness-[0.96] active:brightness-95"
        style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.005em" }}
      >
        <AccessIcon size={20} sw={2} />
        <span>Доступність</span>
      </button>

      {isLoggedIn ? (
        <Link
          href="/account"
          aria-label={firstName ? `Мій акаунт — ${firstName}` : "Мій акаунт"}
          aria-current={accountActive ? "page" : undefined}
          className={
            firstName
              ? "flex items-center gap-2 rounded-full py-1 pl-1.5 pr-3.5 hover:brightness-95"
              : "flex items-center rounded-full px-1.5 py-1 hover:brightness-95"
          }
          style={{ background: "#F8F6F1" }}
        >
          <Avatar initial={initials} tone="sand" size={30} ring="#F8F6F1" />
          {firstName ? (
            <span
              className="text-text max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap"
              style={{
                fontSize: 14,
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
          href="/login"
          className="bg-primary inline-flex items-center justify-center rounded-[10px] px-4.5 py-2.5 text-white shadow-[0_1px_2px_rgba(31,77,52,0.22)] hover:brightness-[1.04]"
          style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
        >
          Увійти
        </Link>
      )}
    </header>
  );
}
