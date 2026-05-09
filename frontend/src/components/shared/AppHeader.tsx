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
        aria-label="Налаштування доступності"
        className="bg-surface text-text relative flex h-[38px] w-[38px] items-center justify-center rounded-xl shadow-soft"
      >
        <AccessIcon size={20} />
        {pulse ? (
          <span
            aria-hidden
            className="border-primary pointer-events-none absolute -inset-0.5 rounded-[14px] border-2"
            style={{ animation: "var(--animate-pulse-ring)" }}
          />
        ) : null}
      </button>
    </div>
  );
}
