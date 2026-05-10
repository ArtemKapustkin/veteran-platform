"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CommunityCard } from "@/components/shared/CommunityCard";
import { Overlays } from "@/components/sheets/Overlays";
import { BackIcon, SearchIcon } from "@/components/icons";
import { useCommunities } from "@/lib/useCommunities";

/**
 * Mobile S-Communities screen — back-button header (we're a sub-section,
 * not in the BottomToolbar), debounced search, vertical card stack. Mirrors
 * the structure of the add-event mobile shell so navigation feels familiar.
 */
export function CommunitiesScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const params = useMemo(
    () => (debouncedQuery ? { search: debouncedQuery } : undefined),
    [debouncedQuery],
  );
  const { communities, loading, error } = useCommunities(params);

  return (
    <main
      aria-label="Спільноти поруч"
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <header
        className="border-border-soft flex flex-shrink-0 items-center gap-3 border-b bg-white px-4 py-3"
      >
        <Link
          href="/map"
          aria-label="Повернутись на карту"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F2F1ED]"
        >
          <BackIcon size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div
            className="text-text"
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.015em",
            }}
          >
            Спільноти поруч
          </div>
          <div className="text-text2" style={{ fontSize: 12 }}>
            Telegram-хаби своїх
          </div>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <label
          className="bg-surface border-border-soft flex h-12 items-center gap-2.5 rounded-2xl border px-3.5 shadow-soft"
        >
          <SearchIcon size={18} stroke="var(--color-text2)" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за назвою"
            aria-label="Пошук спільнот"
            className="placeholder:text-text-muted text-text flex-1 bg-transparent text-[15px] outline-none"
          />
        </label>
      </div>

      <div className="flex-1 overflow-auto px-4 pt-2 pb-8">
        {error ? (
          <Message tone="error">
            Не вдалось завантажити спільноти. {error}
          </Message>
        ) : loading && communities.length === 0 ? (
          <Message>Завантажуємо спільноти…</Message>
        ) : communities.length === 0 ? (
          <Message>
            {debouncedQuery
              ? "Нічого не знайшли. Спробуй іншу назву."
              : "Поки що немає спільнот."}
          </Message>
        ) : (
          <div className="flex flex-col gap-3.5">
            {communities.map((c) => (
              <CommunityCard key={c.id} community={c} />
            ))}
          </div>
        )}
      </div>

      <Overlays />
    </main>
  );
}

function Message({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className="mt-10 text-center"
      style={{
        fontSize: 14,
        color: tone === "error" ? "#9B3D3D" : "var(--color-text2)",
      }}
    >
      {children}
    </div>
  );
}
