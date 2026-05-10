"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import {
  BackIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/icons";
import { ApiError, eventsApi } from "@/lib/api";
import type {
  AdminEventListFilters,
  ApiEvent,
  ApiEventCategory,
  ApiEventDetail,
  EventStatus,
} from "@/lib/api/types";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { toast } from "@/lib/useToast";
import { AdminEventEditor } from "./AdminEventEditor";

// Status filter chips. "all" means no `status=` query param. Order is the
// admin's typical workflow: queue first, then live, then archive.
const STATUS_FILTERS: { id: "all" | EventStatus; label: string }[] = [
  { id: "all", label: "Усі" },
  { id: "pending_approval", label: "На модерації" },
  { id: "published", label: "Опубліковані" },
  { id: "draft", label: "Чернетки" },
  { id: "rejected", label: "Відхилені" },
  { id: "cancelled", label: "Скасовані" },
  { id: "deleted", label: "Видалені" },
];

const STATUS_LABEL: Record<EventStatus, string> = {
  draft: "Чернетка",
  pending_approval: "На модерації",
  published: "Опубліковано",
  rejected: "Відхилено",
  cancelled: "Скасовано",
  deleted: "Видалено",
};

const STATUS_TONE: Record<EventStatus, PillColor> = {
  draft: "grey",
  pending_approval: "amber",
  published: "green",
  rejected: "rose",
  cancelled: "grey",
  deleted: "dark",
};

const CATEGORY_LABEL: Record<ApiEventCategory, string> = {
  spa: "СПА",
  sport: "Спорт",
  yoga: "Йога",
  culture: "Культура",
  education: "Навчання",
  nature: "Природа",
  psychology: "Психологія",
  social: "Спілкування",
  rehabilitation: "Реабілітація",
};

const PAGE_LIMIT = 200;

export function AdminEventsScreen() {
  const router = useRouter();
  const mounted = useMounted();
  const role = useAuthStore((s) => s.role);
  const loggedIn = useAuthStore((s) => s.loggedIn);

  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]["id"]>("pending_approval");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<ApiEvent | null>(null);
  // `busyId` tracks which row is currently performing a row-level action so
  // the buttons can show the disabled state without freezing the whole list.
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Auth gate: only admins may see this screen. ─────────────────────
  useEffect(() => {
    if (!mounted) return;
    if (!loggedIn) {
      router.replace("/login?next=%2Fadmin%2Fevents");
      return;
    }
    if (role !== "admin") {
      router.replace("/account");
    }
  }, [mounted, loggedIn, role, router]);

  // Debounce the free-text search so we don't hammer the backend on every
  // keystroke. 300 ms is the standard "feels live but isn't" threshold.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo<AdminEventListFilters>(() => {
    const f: AdminEventListFilters = {
      limit: PAGE_LIMIT,
      sort: "date_asc",
    };
    if (statusFilter !== "all") f.status = [statusFilter];
    if (debouncedSearch) f.q = debouncedSearch;
    return f;
  }, [statusFilter, debouncedSearch]);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const page = await eventsApi.adminList(filters, signal);
        setItems(page.items);
        setError(null);
      } catch (e) {
        if (signal?.aborted) return;
        if (e instanceof ApiError && e.status === 401) {
          router.replace("/login?next=%2Fadmin%2Fevents");
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

  // ── Row actions ─────────────────────────────────────────────────────

  const withBusy = useCallback(
    async (
      id: string,
      action: () => Promise<ApiEventDetail | void>,
      successMsg: string,
    ) => {
      setBusyId(id);
      try {
        await action();
        toast.success(successMsg);
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Не вдалось виконати дію";
        toast.error(msg);
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const onApprove = (ev: ApiEvent) =>
    withBusy(ev.id, () => eventsApi.adminApprove(ev.id), "Подію опубліковано");

  const onReject = (ev: ApiEvent) => {
    const reason =
      typeof window !== "undefined"
        ? window.prompt("Причина відхилення (опційно):") ?? ""
        : "";
    return withBusy(
      ev.id,
      () => eventsApi.adminReject(ev.id, reason),
      "Подію відхилено",
    );
  };

  const onPublish = (ev: ApiEvent) =>
    withBusy(ev.id, () => eventsApi.adminPublish(ev.id), "Подію опубліковано");

  const onCancel = (ev: ApiEvent) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Скасувати «${ev.title}»? Усі активні реєстрації стануть скасованими.`,
      );
      if (!ok) return;
    }
    return withBusy(
      ev.id,
      () => eventsApi.adminCancel(ev.id),
      "Подію скасовано",
    );
  };

  const onDelete = (ev: ApiEvent) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        `Видалити «${ev.title}»? Запис залишиться в архіві зі статусом “видалено”.`,
      );
      if (!ok) return;
    }
    return withBusy(
      ev.id,
      () => eventsApi.adminRemove(ev.id),
      "Подію видалено",
    );
  };

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
            <Empty>Завантажуємо події…</Empty>
          ) : items.length === 0 ? (
            <Empty>За вибраним фільтром нічого немає.</Empty>
          ) : (
            <EventTable
              items={items}
              busyId={busyId}
              onEdit={(ev) => setEditEvent(ev)}
              onApprove={onApprove}
              onReject={onReject}
              onPublish={onPublish}
              onCancel={onCancel}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>

      {editEvent ? (
        <AdminEventEditor
          key={editEvent.id}
          mode={{ kind: "edit", event: editEvent }}
          onClose={() => setEditEvent(null)}
          onSaved={async () => {
            setEditEvent(null);
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
          Адмін · Події
        </div>
        <div
          className="text-text2 mt-0.5"
          style={{ fontSize: 12 }}
        >
          Створення, редагування, модерація
        </div>
      </div>
      <Link
        href="/admin/verifications"
        className="border-border text-text hidden items-center rounded-[10px] border bg-white px-3.5 py-2 hover:bg-black/5 sm:inline-flex"
        style={{ fontSize: 13, fontWeight: 500 }}
      >
        Верифікації
      </Link>
      <Link href="/admin/events/new">
        <Btn kind="primary" size="md" icon={<PlusIcon size={16} />} asLink>
          Створити
        </Btn>
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
  status: (typeof STATUS_FILTERS)[number]["id"];
  onStatus: (id: (typeof STATUS_FILTERS)[number]["id"]) => void;
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
          placeholder="Пошук за назвою чи описом…"
          className="text-text placeholder:text-text-muted h-full w-full bg-transparent outline-none"
          style={{ fontSize: 14 }}
        />
      </label>
    </div>
  );
}

// ─── Table ─────────────────────────────────────────────────────────────

function EventTable({
  items,
  busyId,
  onEdit,
  onApprove,
  onReject,
  onPublish,
  onCancel,
  onDelete,
}: {
  items: ApiEvent[];
  busyId: string | null;
  onEdit: (ev: ApiEvent) => void;
  onApprove: (ev: ApiEvent) => void;
  onReject: (ev: ApiEvent) => void;
  onPublish: (ev: ApiEvent) => void;
  onCancel: (ev: ApiEvent) => void;
  onDelete: (ev: ApiEvent) => void;
}) {
  return (
    <div className="border-border-soft overflow-hidden rounded-2xl border bg-white">
      <div
        className="border-border-soft text-text-muted hidden grid-cols-[2.4fr_1fr_1.4fr_1fr_1fr_auto] items-center gap-3 border-b px-4 py-3 lg:grid"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <span>Подія</span>
        <span>Статус</span>
        <span>Початок</span>
        <span>Місць</span>
        <span>Створив</span>
        <span className="justify-self-end">Дії</span>
      </div>
      <ul className="flex flex-col">
        {items.map((ev) => (
          <li
            key={ev.id}
            className="border-border-soft grid grid-cols-1 gap-3 border-b px-4 py-3.5 last:border-0 lg:grid-cols-[2.4fr_1fr_1.4fr_1fr_1fr_auto] lg:items-center"
          >
            <div className="min-w-0">
              <div
                className="text-text overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                }}
                title={ev.title}
              >
                {ev.title}
              </div>
              <div className="text-text2 mt-0.5 flex items-center gap-1.5" style={{ fontSize: 12 }}>
                <span>{CATEGORY_LABEL[ev.category]}</span>
                <span aria-hidden>·</span>
                <span>
                  {ev.location?.city || (ev.format === "online" ? "онлайн" : "—")}
                </span>
              </div>
            </div>
            <div>
              <Pill color={STATUS_TONE[ev.status]}>{STATUS_LABEL[ev.status]}</Pill>
            </div>
            <div className="text-text2" style={{ fontSize: 13 }}>
              {formatStartsAt(ev.starts_at)}
            </div>
            <div className="text-text2" style={{ fontSize: 13 }}>
              {ev.seats_taken}/{ev.quota}
            </div>
            <div className="text-text2" style={{ fontSize: 13 }}>
              {ev.created_by_role === "admin" ? "Адмін" : "Ветеран"}
            </div>
            <RowActions
              event={ev}
              busy={busyId === ev.id}
              onEdit={onEdit}
              onApprove={onApprove}
              onReject={onReject}
              onPublish={onPublish}
              onCancel={onCancel}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RowActions({
  event,
  busy,
  onEdit,
  onApprove,
  onReject,
  onPublish,
  onCancel,
  onDelete,
}: {
  event: ApiEvent;
  busy: boolean;
  onEdit: (ev: ApiEvent) => void;
  onApprove: (ev: ApiEvent) => void;
  onReject: (ev: ApiEvent) => void;
  onPublish: (ev: ApiEvent) => void;
  onCancel: (ev: ApiEvent) => void;
  onDelete: (ev: ApiEvent) => void;
}) {
  const isDeleted = event.status === "deleted";
  return (
    <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
      {event.status === "pending_approval" ? (
        <>
          <Btn
            kind="success"
            size="sm"
            onClick={() => onApprove(event)}
            disabled={busy}
          >
            Затвердити
          </Btn>
          <Btn
            kind="secondary"
            size="sm"
            onClick={() => onReject(event)}
            disabled={busy}
          >
            Відхилити
          </Btn>
        </>
      ) : null}
      {event.status === "draft" ? (
        <Btn
          kind="success"
          size="sm"
          onClick={() => onPublish(event)}
          disabled={busy}
        >
          Опублікувати
        </Btn>
      ) : null}
      {event.status === "published" ? (
        <Btn
          kind="secondary"
          size="sm"
          onClick={() => onCancel(event)}
          disabled={busy}
        >
          Скасувати
        </Btn>
      ) : null}
      <IconBtn
        label="Редагувати"
        onClick={() => onEdit(event)}
        disabled={busy || isDeleted}
      >
        <PencilIcon size={15} />
      </IconBtn>
      <IconBtn
        label="Видалити"
        tone="danger"
        onClick={() => onDelete(event)}
        disabled={busy || isDeleted}
      >
        <TrashIcon size={15} />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
  tone = "default",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="border-border bg-white inline-flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        color: tone === "danger" ? "#9B3D3D" : "var(--color-text)",
      }}
    >
      {children}
    </button>
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

const MONTH_ABBR = [
  "січ", "лют", "бер", "квіт", "трав", "черв",
  "лип", "сер", "вер", "жовт", "лист", "груд",
] as const;

function formatStartsAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const month = MONTH_ABBR[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month}, ${hh}:${mm}`;
}
