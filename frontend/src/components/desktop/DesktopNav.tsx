"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/atoms/Avatar";
import { AccessIcon, PlusIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/cn";

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
  // Default to the guest layout on SSR/first paint to avoid hydration drift
  // between server and client (the auth store is localStorage-backed).
  const isLoggedIn = mounted && loggedIn;

  const onAccess = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("a11y", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  const eventsActive =
    pathname === "/map" ||
    pathname === "/list" ||
    pathname.startsWith("/events");
  const savedActive = pathname === "/saved";
  const accountActive = pathname === "/account";
  const addEventActive = pathname === "/add-event";

  return (
    <header
      className="border-border-soft flex flex-shrink-0 items-center gap-3 border-b bg-white px-8"
      style={{ height: 64 }}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5"
        aria-label="Свої поруч — на головну"
      >
        <span
          aria-hidden
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-[#1A1A1A] text-white"
          style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          сп
        </span>
        <span
          className="text-text"
          style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Свої поруч
        </span>
      </Link>

      <nav className="ml-6 flex items-center gap-0.5" aria-label="Розділи">
        <NavTab label="Події поруч" href="/map" active={eventsActive} />
        <ComingSoonItem label="Спільноти поруч" />
        <ComingSoonItem label="Акції поруч" />
        {isLoggedIn ? (
          <NavTab label="Збережені" href="/saved" active={savedActive} />
        ) : null}
      </nav>

      <div className="flex-1" />

      <Link
        href="/add-event"
        aria-current={addEventActive ? "page" : undefined}
        className={cn(
          "border-border text-text flex items-center gap-2 rounded-[10px] border px-3.5 py-2.5 transition-colors hover:bg-[#F8F6F1]",
          addEventActive ? "bg-[#F8F6F1]" : "bg-transparent",
        )}
        style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
      >
        <PlusIcon size={15} />
        Додати подію
      </Link>

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
          aria-label="Мій акаунт"
          aria-current={accountActive ? "page" : undefined}
          className="flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1 hover:brightness-95"
          style={{ background: "#F8F6F1" }}
        >
          <Avatar initial="О" tone="sand" size={30} ring="#F8F6F1" />
          <span
            className="text-text"
            style={{
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            Олег
          </span>
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
