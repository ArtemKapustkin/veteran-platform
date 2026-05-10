"use client";

import { useEffect, useMemo, useState } from "react";
import { CommunityCard } from "@/components/shared/CommunityCard";
import { SearchIcon } from "@/components/icons";
import { Overlays } from "@/components/sheets/Overlays";
import { useCommunities } from "@/lib/useCommunities";
import { DesktopNav } from "./DesktopNav";

/**
 * Desktop "Спільноти поруч" — top nav + a 3-column responsive grid of
 * community cards. Search is debounced to ~300 ms before hitting the API
 * (mirrors the prototype's "live filter" feel without spamming requests).
 */
export function DesktopCommunitiesShell() {
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
    <div className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}>
      <DesktopNav />
      <main className="mx-auto w-full px-20 py-10" style={{ maxWidth: 1280 }}>
        <h1
          className="text-text m-0"
          style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}
        >
          Спільноти поруч
        </h1>
        <p
          className="text-text2 m-0 mt-1.5"
          style={{ fontSize: 14, letterSpacing: "-0.005em", maxWidth: 640 }}
        >
          Зовнішні Telegram-хаби — місця, де ветерани, родини та діючі
          військові спілкуються поза подіями.
        </p>

        <div className="mt-6" style={{ maxWidth: 480 }}>
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

        <CommunitiesBody
          loading={loading}
          error={error}
          communities={communities}
          hasQuery={Boolean(debouncedQuery)}
        />
      </main>
      <Overlays desktop />
    </div>
  );
}

function CommunitiesBody({
  loading,
  error,
  communities,
  hasQuery,
}: {
  loading: boolean;
  error: string | null;
  communities: ReturnType<typeof useCommunities>["communities"];
  hasQuery: boolean;
}) {
  if (error) {
    return (
      <Notice tone="error">
        Не вдалось завантажити спільноти. {error}
      </Notice>
    );
  }
  if (loading && communities.length === 0) {
    return <Notice>Завантажуємо спільноти…</Notice>;
  }
  if (communities.length === 0) {
    return (
      <Notice>
        {hasQuery
          ? "Нічого не знайшли. Спробуй іншу назву."
          : "Поки що немає спільнот. Стань першою, хто створить."}
      </Notice>
    );
  }
  return (
    <div
      className="mt-6 grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gridAutoRows: "min-content",
      }}
    >
      {communities.map((c) => (
        <CommunityCard key={c.id} community={c} />
      ))}
    </div>
  );
}

function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className="mt-12 text-center"
      style={{
        fontSize: 14,
        color:
          tone === "error" ? "#9B3D3D" : "var(--color-text2)",
      }}
    >
      {children}
    </div>
  );
}
