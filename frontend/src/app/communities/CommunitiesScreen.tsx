"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/shared/AppHeader";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { CommunityCard } from "@/components/shared/CommunityCard";
import { Overlays } from "@/components/sheets/Overlays";
import { SearchIcon } from "@/components/icons";
import { useCommunities } from "@/lib/useCommunities";

/**
 * Mobile S-Communities screen — now a top-level destination accessible
 * from the BottomToolbar's "Спільноти" tab. Same chrome as Map / List /
 * Saved (AppHeader at the top, floating BottomToolbar at the bottom) plus
 * an inline title block, so navigating between primary tabs feels
 * consistent.
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
      <div className="pt-3 pb-2">
        <AppHeader />
      </div>

      <div className="px-5.5 pt-2">
        <h1
          className="text-text mt-2.5 mb-1"
          style={{
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          Спільноти поруч
        </h1>
        <div className="text-text2" style={{ fontSize: 13 }}>
          Telegram-хаби своїх
        </div>
      </div>

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

      <div className="flex-1 overflow-auto px-4 pt-2 pb-28">
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

      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="communities" />
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
