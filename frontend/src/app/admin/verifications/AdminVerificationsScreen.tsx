"use client";

// Admin queue for veteran document verification.
//
// Lists veterans whose AI verification didn't auto-approve. The most
// useful default view is `pending_review` — the bucket the admin actually
// owns — but the filter chips also expose `rejected` (someone the admin
// previously turned down, in case it needs to be reopened) and `approved`
// (audit purposes).
//
// Backend mapping:
//   GET    /api/v1/admin/veterans?verification_status=…   → list
//   GET    /api/v1/admin/veterans/{id}                   → detail + history
//   POST   /api/v1/admin/veterans/{id}/verify            → approve/reject
//   POST   /api/v1/admin/veterans/{id}/block             → block account

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { BackIcon, SearchIcon, ShieldCheckIcon } from "@/components/icons";
import { ApiError, adminVeteransApi } from "@/lib/api";
import type {
  AdminVeteranListFilters,
  Veteran,
  VerificationStatus,
} from "@/lib/api/types";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { AdminVerificationDrawer } from "./AdminVerificationDrawer";

// Statuses surfaced by the queue. `pending_review` first because that's
// the admin's actual workload; the other two exist for context only.
const STATUS_FILTERS: { id: VerificationStatus; label: string }[] = [
  { id: "pending_review", label: "На розгляді" },
  { id: "rejected", label: "Відхилені" },
  { id: "approved", label: "Підтверджені" },
  { id: "processing", label: "В обробці" },
];

const STATUS_LABEL: Record<VerificationStatus, string> = {
  none: "Не подано",
  processing: "В обробці",
  pending_review: "На розгляді",
  approved: "Підтверджено",
  rejected: "Відхилено",
};

const STATUS_TONE: Record<VerificationStatus, PillColor> = {
  none: "grey",
  processing: "blue",
  pending_review: "amber",
  approved: "green",
  rejected: "rose",
};

const AUDIENCE_LABEL: Record<string, string> = {
  veteran: "Ветеран",
  veteran_female: "Ветеранка",
  family: "Родина",
  fallen_family: "Родина загиблого",
  active_military: "Діючий військовий",
  other: "Інше",
};

const PAGE_LIMIT = 100;

export function AdminVerificationsScreen() {
  const router = useRouter();
  const mounted = useMounted();
  const role = useAuthStore((s) => s.role);
  const loggedIn = useAuthStore((s) => s.loggedIn);

  const [statusFilter, setStatusFilter] =
    useState<VerificationStatus>("pending_review");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<Veteran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // ── Auth gate: only admins may see this screen. ──────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (!loggedIn) {
      router.replace("/login?next=%2Fadmin%2Fverifications");
      return;
    }
    if (role !== "admin") {
      router.replace("/account");
    }
  }, [mounted, loggedIn, role, router]);

  // Debounce free-text search so we don't hit the backend on every
  // keystroke. 300 ms is the standard "feels live" threshold and matches
  // the events admin screen.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo<AdminVeteranListFilters>(() => {
    const f: AdminVeteranListFilters = {
      verification_status: statusFilter,
      limit: PAGE_LIMIT,
    };
    if (debouncedSearch) f.q = debouncedSearch;
    return f;
  }, [statusFilter, debouncedSearch]);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const page = await adminVeteransApi.list(filters, signal);
        const list = page?.items;
        setItems(Array.isArray(list) ? list : []);
        setError(null);
      } catch (e) {
        if (signal?.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login?next=%2Fadmin%2Fverifications");
          return;
        }
        if (e instanceof ApiError && e.status === 403) {
          router.replace("/account");
          return;
        }
        setError(e instanceof Error ? e.message : "Не вдалось завантажити");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [filters, router],
  );

  useEffect(() => {
    if (!mounted || role !== "admin") return;
    const controller = new AbortController();
    // Defer the loading flag flip into a microtask to satisfy React 19's
    // `react-hooks/set-state-in-effect` rule, then kick off the fetch.
    void Promise.resolve()
      .then(() => setLoading(true))
      .then(() => refresh(controller.signal));
    return () => controller.abort();
  }, [mounted, role, refresh]);

  // Don't render the table while we're waiting for the auth gate to
  // resolve — prevents a flash of "Завантажуємо…" for guests/veterans
  // who'll be bounced away in the very next tick.
  if (!mounted || role !== "admin") {
    return (
      <main
        className="bg-bg flex min-h-[100dvh] items-center justify-center"
        aria-busy="true"
      >
        <span className="text-text2" style={{ fontSize: 14 }}>
          Перевіряємо доступ…
        </span>
      </main>
    );
  }

  return (
    <main className="bg-bg flex min-h-[100dvh] flex-col">
      <Header />

      <div className="mx-auto w-full max-w-[1200px] flex-1 px-5 pt-5 pb-12 sm:px-8">
        <FiltersBar
          status={statusFilter}
          onStatus={setStatusFilter}
          search={search}
          onSearch={setSearch}
        />

        <div className="mt-5">
          {error ? (
            <Empty>
              Не вдалось завантажити список.
              <br />
              <span className="text-text2" style={{ fontSize: 13 }}>
                {error}
              </span>
            </Empty>
          ) : loading ? (
            <Empty>Завантажуємо чергу…</Empty>
          ) : items.length === 0 ? (
            <Empty>
              {statusFilter === "pending_review"
                ? "Немає документів на ручний розгляд. Чудово."
                : "За вибраним фільтром нічого немає."}
            </Empty>
          ) : (
            <VeteranTable items={items} onOpen={(v) => setOpenId(v.id)} />
          )}
        </div>
      </div>

      {openId ? (
        <AdminVerificationDrawer
          veteranId={openId}
          onClose={() => setOpenId(null)}
          onResolved={async () => {
            setOpenId(null);
            await refresh();
          }}
        />
      ) : null}
    </main>
  );
}

// ─── Header ────────────────────────────────────────────────────────────

function Header() {
  return (
    <header
      className="border-border-soft sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-5 sm:px-8"
      style={{ height: 64 }}
    >
      <Link
        href="/account"
        aria-label="Назад в акаунт"
        className="text-text2 -ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5"
      >
        <BackIcon size={20} />
      </Link>
      <div className="min-w-0 flex-1">
        <div
          className="text-text"
          style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}
        >
          Адмін · Верифікації
        </div>
        <div className="text-text2 mt-0.5" style={{ fontSize: 12 }}>
          Ручний розгляд документів, які не пройшли AI-перевірку
        </div>
      </div>
      <Link
        href="/admin/events"
        className="border-border text-text rounded-[10px] border bg-white px-3.5 py-2 hover:bg-black/5"
        style={{ fontSize: 13, fontWeight: 500 }}
      >
        До подій
      </Link>
    </header>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────

function FiltersBar({
  status,
  onStatus,
  search,
  onSearch,
}: {
  status: VerificationStatus;
  onStatus: (id: VerificationStatus) => void;
  search: string;
  onSearch: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => {
          const active = f.id === status;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onStatus(f.id)}
              aria-pressed={active}
              className="inline-flex items-center rounded-full px-3.5 py-1.5 transition-colors"
              style={{
                background: active ? "#1A1A1A" : "#fff",
                color: active ? "#fff" : "var(--color-text)",
                border: active ? "none" : "1px solid var(--color-border)",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "-0.005em",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      <label
        className="border-border bg-surface flex h-11 items-center gap-2 rounded-[12px] border px-3 focus-within:border-[var(--color-primary)]"
        style={{ maxWidth: 480 }}
      >
        <SearchIcon size={16} />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Пошук за ПІБ, телефоном чи бригадою…"
          className="text-text placeholder:text-text-muted h-full w-full bg-transparent outline-none"
          style={{ fontSize: 14 }}
        />
      </label>
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────

function VeteranTable({
  items,
  onOpen,
}: {
  items: Veteran[];
  onOpen: (v: Veteran) => void;
}) {
  return (
    <div className="border-border-soft overflow-hidden rounded-2xl border bg-white">
      <div
        className="border-border-soft text-text-muted hidden grid-cols-[2.4fr_1fr_1.2fr_1.4fr_1fr_auto] items-center gap-3 border-b px-4 py-3 lg:grid"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>Ветеран</span>
        <span>Категорія</span>
        <span>Бригада</span>
        <span>Телефон</span>
        <span>Статус</span>
        <span className="justify-self-end">Дія</span>
      </div>
      <ul className="flex flex-col">
        {items.map((v) => (
          <li
            key={v.id}
            className="border-border-soft grid grid-cols-1 gap-3 border-b px-4 py-3.5 last:border-0 lg:grid-cols-[2.4fr_1fr_1.2fr_1.4fr_1fr_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div
                className="text-text overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                }}
                title={v.fullname ?? "—"}
              >
                {v.fullname || "Без імені"}
              </div>
              <div
                className="text-text2 mt-0.5 flex items-center gap-1.5"
                style={{ fontSize: 12 }}
              >
                <span>
                  {new Date(v.created_at).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {v.city ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{v.city}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="text-text2" style={{ fontSize: 13 }}>
              {v.audience_status
                ? AUDIENCE_LABEL[v.audience_status] ?? v.audience_status
                : "—"}
            </div>
            <div
              className="text-text2 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ fontSize: 13 }}
              title={v.brigade ?? ""}
            >
              {v.brigade || "—"}
            </div>
            <div className="text-text2" style={{ fontSize: 13 }}>
              {v.phone || "—"}
            </div>
            <div>
              <Pill color={STATUS_TONE[v.verification_status]}>
                {STATUS_LABEL[v.verification_status]}
              </Pill>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              <Btn
                kind="dark"
                size="sm"
                icon={<ShieldCheckIcon size={14} />}
                onClick={() => onOpen(v)}
              >
                Розглянути
              </Btn>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border-border-soft text-text2 mx-auto rounded-2xl border bg-white px-6 py-14 text-center"
      style={{ fontSize: 14, lineHeight: 1.5 }}
    >
      {children}
    </div>
  );
}
