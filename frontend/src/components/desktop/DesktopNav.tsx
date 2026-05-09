"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AccessIcon, PlusIcon } from "@/components/icons";
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
      className="rounded-lg px-3.5 py-2 transition-colors"
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

export function DesktopNav() {
  const router = useRouter();
  const pathname = usePathname();

  const onAccess = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("a11y", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  const eventsActive = pathname === "/map" || pathname === "/list" || pathname.startsWith("/events");
  const savedActive = pathname === "/saved";
  const addEventActive = pathname === "/add-event";

  return (
    <header
      className="border-border-soft flex flex-shrink-0 items-center gap-4 border-b bg-white px-8"
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

      <nav className="ml-6 flex gap-1" aria-label="Розділи">
        <NavTab label="Події" href="/map" active={eventsActive} />
        <NavTab label="Збережені" href="/saved" active={savedActive} />
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
        aria-label="Налаштування доступності"
        className="text-text flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-[#F8F6F1] hover:brightness-95"
      >
        <AccessIcon size={20} />
      </button>

      <Link
        href="/login"
        className="bg-primary inline-flex items-center justify-center rounded-[10px] px-4.5 py-2.5 text-white shadow-[0_1px_2px_rgba(31,77,52,0.22)] hover:brightness-[1.04]"
        style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
      >
        Увійти
      </Link>
    </header>
  );
}
