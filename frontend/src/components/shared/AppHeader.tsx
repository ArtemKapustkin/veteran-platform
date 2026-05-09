"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccessIcon } from "@/components/icons";

export function AppHeader({
  pulse = false,
  onOpenAccess,
}: {
  pulse?: boolean;
  onOpenAccess?: () => void;
}) {
  const router = useRouter();
  const handleAccess = () => {
    if (onOpenAccess) {
      onOpenAccess();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("a11y", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <Link
        href="/map"
        className="flex items-center gap-2 outline-none"
        aria-label="Свої поруч — на головну"
      >
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#1A1A1A] text-white"
          style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          сп
        </span>
        <span
          className="text-text"
          style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Свої поруч
        </span>
      </Link>
      <button
        type="button"
        onClick={handleAccess}
        aria-label="Доступність — налаштування інклюзивності"
        title="Доступність"
        className="border-primary bg-primary-soft text-primary-ink relative flex h-11 items-center gap-1.5 rounded-full border-2 pl-2.5 pr-3.5 shadow-soft active:brightness-95"
        style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em" }}
      >
        <AccessIcon size={20} sw={2} />
        <span>Доступність</span>
        {pulse ? (
          <span
            aria-hidden
            className="border-primary pointer-events-none absolute -inset-0.5 rounded-full border-2"
            style={{ animation: "var(--animate-pulse-ring)" }}
          />
        ) : null}
      </button>
    </div>
  );
}
