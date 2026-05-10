"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import {
  ArrowIcon,
  CalIcon,
  CheckIcon,
  ClockIcon,
  PinIcon,
  UserIcon,
} from "@/components/icons";
import {
  ApiError,
  invitationsApi,
  type InvitationLookup,
} from "@/lib/api";
import { useAuthStore, useEventsStore } from "@/lib/store";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { useMounted } from "@/lib/useMounted";
import { toast } from "@/lib/useToast";

// Public landing page for a Telegram-share invitation. The flow:
//   1. Fetch the public preview (no auth needed) so the recipient can
//      see what they're being invited to before committing to sign in.
//   2. If they're signed in and the slot is still pending, show a big
//      "Прийняти запрошення" CTA. Tapping it calls /claim and routes
//      to the event page on success.
//   3. Otherwise (signed-out, expired, already used by someone else,
//      already accepted by the viewer) show the appropriate empty
//      state with the right next-step button.
//
// Auth round-trip: when not signed in, the CTA delegates to
// `useAuthGuard` which redirects to /login?next=/invitations/{token}.
// After OTP, the wizard sends the user back here and the now-authed
// preview fetch surfaces the claim button.

interface InvitationLandingScreenProps {
  token: string;
}

export function InvitationLandingScreen({ token }: InvitationLandingScreenProps) {
  const router = useRouter();
  const mounted = useMounted();
  const isAuthed = useAuthStore((s) => s.loggedIn);
  const requireAuth = useAuthGuard();
  const applyRegistration = useEventsStore((s) => s.applyRegistration);

  const [data, setData] = useState<InvitationLookup | null>(null);
  // `error` holds a user-facing message when the lookup fails (404,
  // network); the dedicated 404 branch lets us tailor copy.
  const [error, setError] = useState<{ status: number; message: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  // Bumped to force `refresh` after a non-401 claim error so the empty
  // state catches up if the slot moved to expired / used between the
  // lookup and the claim.
  const [reloadTick, setReloadTick] = useState(0);

  // Re-fetch when the access token changes so signing in mid-flow
  // re-runs the lookup with auth and surfaces `already_claimed_by_me`.
  const accessToken = useAuthStore((s) => s.accessToken);

  // Pattern mirrors `useEvents` / `useEvent`: fetch directly inside
  // the effect, do all setStates from the async callback so the lint
  // rule against synchronous setState-in-effect stays happy.
  useEffect(() => {
    const controller = new AbortController();
    invitationsApi
      .lookup(token, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError) {
          setError({ status: e.status, message: e.message });
        } else {
          setError({ status: 0, message: (e as Error).message });
        }
        setData(null);
        setLoading(false);
      });
    return () => controller.abort();
  }, [token, accessToken, reloadTick]);

  const refresh = useCallback(() => setReloadTick((n) => n + 1), []);

  const handleClaim = async () => {
    if (claiming) return;
    if (!requireAuth({ hint: "Щоб приєднатись до групи" })) return;
    setClaiming(true);
    try {
      const reg = await invitationsApi.claim(token);
      applyRegistration(reg);
      toast.success("Ти у групі", "Зустрінемось на події.");
      if (data?.event?.id) {
        router.push(`/events/${data.event.id}`);
      } else {
        router.push("/account");
      }
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          // Bearer token went stale between the lookup and the claim.
          // Bounce through the gate so the wizard refreshes the session.
          requireAuth({ hint: "Сесія завершилась — увійди знову" });
        } else {
          toast.error("Не вдалось приєднатись", e.message);
          // Refresh so the UI flips to the right empty state if the
          // server now reports the slot as expired / used.
          void refresh();
        }
      } else {
        toast.error("Не вдалось приєднатись", (e as Error).message);
      }
    } finally {
      setClaiming(false);
    }
  };

  // All hooks must run unconditionally — guard with empty string when
  // data hasn't arrived yet so the eslint rules-of-hooks check passes.
  const expired = useIsExpired(data?.reservation_expires_at ?? "");

  if (loading || !mounted) {
    return (
      <Shell>
        <div
          className="text-text2"
          style={{ fontSize: 14, padding: "32px 0", textAlign: "center" }}
        >
          Завантажуємо запрошення…
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    const notFound = error?.status === 404;
    return (
      <Shell>
        <EmptyState
          title={notFound ? "Запрошення не знайдено" : "Не вдалось завантажити"}
          body={
            notFound
              ? "Можливо, посилання застаріло або хтось інший уже скористався ним."
              : (error?.message ?? "Спробуй ще раз за хвилину.")
          }
          primaryLabel="На головну"
          onPrimary={() => router.push("/")}
        />
      </Shell>
    );
  }

  const inviter =
    data.invited_by_fullname?.trim() || "Побратим";

  // Branch on the four real states. Order matters: "claimed by me"
  // before "already used" before "expired" so a user who already
  // accepted sees a friendly "you're in" state even after the TTL.
  if (data.already_claimed_by_me) {
    return (
      <Shell>
        <EventPreview data={data} inviter={inviter} />
        <Status
          tone="success"
          icon={<CheckIcon size={16} />}
          title="Ти вже у групі"
          body="Запис підтверджено. Зустрінемось на події."
        />
        <div className="flex flex-col gap-2">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            iconRight={<ArrowIcon size={18} />}
            onClick={() => router.push(`/events/${data.event.id}`)}
          >
            До події
          </Btn>
        </div>
      </Shell>
    );
  }

  if (data.status !== "pending") {
    return (
      <Shell>
        <EventPreview data={data} inviter={inviter} />
        <Status
          tone="muted"
          title="Запрошення вже неактивне"
          body={
            data.status === "declined"
              ? "Хтось у групі відхилив запрошення — місця звільнились."
              : "Це посилання вже використане."
          }
        />
        <div className="flex flex-col gap-2">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            iconRight={<ArrowIcon size={18} />}
            onClick={() => router.push(`/events/${data.event.id}`)}
          >
            Подивитись подію
          </Btn>
        </div>
      </Shell>
    );
  }

  if (expired) {
    return (
      <Shell>
        <EventPreview data={data} inviter={inviter} />
        <Status
          tone="muted"
          title="Запрошення прострочено"
          body="Бронювання групи закінчилось. Попроси організатора створити нове."
        />
        <div className="flex flex-col gap-2">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            iconRight={<ArrowIcon size={18} />}
            onClick={() => router.push(`/events/${data.event.id}`)}
          >
            Подивитись подію
          </Btn>
        </div>
      </Shell>
    );
  }

  // Pending + (auth or guest). The CTA copy / behavior splits on auth.
  return (
    <Shell>
      <EventPreview data={data} inviter={inviter} />
      <ExpiresHint iso={data.reservation_expires_at} />
      <div className="flex flex-col gap-2">
        <Btn
          kind="primary"
          size="lg"
          fullWidth
          loading={claiming}
          onClick={handleClaim}
        >
          {isAuthed ? "Прийняти запрошення" : "Увійти, щоб приєднатись"}
        </Btn>
        <Btn
          kind="ghost"
          size="md"
          fullWidth
          disabled={claiming}
          onClick={() => router.push(`/events/${data.event.id}`)}
        >
          Спочатку подивитись подію
        </Btn>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg flex min-h-[100dvh] flex-col">
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-5 px-5 py-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}

interface EventPreviewProps {
  data: InvitationLookup;
  inviter: string;
}

function EventPreview({ data, inviter }: EventPreviewProps) {
  const startsLabel = useMemo(
    () => formatStartsAt(data.event.starts_at),
    [data.event.starts_at],
  );
  const place = useMemo(() => formatPlace(data.event.location), [data.event.location]);
  return (
    <div className="border-border-soft flex flex-col gap-3 rounded-2xl border bg-white p-5">
      <div
        className="text-text-muted inline-flex items-center gap-1.5"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        <UserIcon size={12} />
        {inviter} запросив(ла) тебе
      </div>
      <h1
        className="text-text m-0"
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {data.event.title}
      </h1>
      <div
        className="text-text2 flex flex-wrap items-center"
        style={{ rowGap: 6, columnGap: 14, fontSize: 13 }}
      >
        {startsLabel ? (
          <span className="flex items-center gap-1.5">
            <CalIcon size={13} />
            {startsLabel}
          </span>
        ) : null}
        {place ? (
          <span className="flex items-center gap-1.5">
            <PinIcon size={13} />
            {place}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          <UserIcon size={13} />
          {data.seats_in_group} місця у групі
        </span>
      </div>
      {data.event.description ? (
        <p
          className="text-text m-0"
          style={{ fontSize: 14, lineHeight: 1.55 }}
        >
          {data.event.description}
        </p>
      ) : null}
    </div>
  );
}

interface StatusProps {
  tone: "success" | "muted";
  icon?: React.ReactNode;
  title: string;
  body: string;
}

function Status({ tone, icon, title, body }: StatusProps) {
  const palette =
    tone === "success"
      ? { bg: "#E8F6EF", border: "#BFE7CF", title: "#0E6E45" }
      : { bg: "#F4F2EE", border: "#E3DFD8", title: "#3A352D" };
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl px-4 py-3.5"
      style={{ background: palette.bg, border: `1px solid ${palette.border}` }}
    >
      <span
        className="inline-flex items-center gap-2"
        style={{
          color: palette.title,
          fontSize: 14.5,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {icon}
        {title}
      </span>
      <span className="text-text2" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {body}
      </span>
    </div>
  );
}

function ExpiresHint({ iso }: { iso: string }) {
  const label = useExpiresIn(iso);
  if (!label) return null;
  return (
    <div
      className="text-text2 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1"
      style={{ background: "#FFF4E2", color: "#7A4A0A", fontSize: 12, fontWeight: 600 }}
    >
      <ClockIcon size={12} />
      {label}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
}

function EmptyState({ title, body, primaryLabel, onPrimary }: EmptyStateProps) {
  return (
    <div className="border-border-soft flex flex-col gap-3 rounded-2xl border bg-white p-5">
      <h1
        className="text-text m-0"
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h1>
      <p className="text-text2 m-0" style={{ fontSize: 14, lineHeight: 1.55 }}>
        {body}
      </p>
      <Btn
        kind="primary"
        size="lg"
        fullWidth
        iconRight={<ArrowIcon size={18} />}
        onClick={onPrimary}
      >
        {primaryLabel}
      </Btn>
    </div>
  );
}

const DOW = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"] as const;
const MONTH_ABBR = [
  "січ", "лют", "бер", "квіт", "трав", "черв",
  "лип", "сер", "вер", "жовт", "лист", "груд",
] as const;

function formatStartsAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${DOW[d.getDay()]}, ${d.getDate()} ${MONTH_ABBR[d.getMonth()]} · ${hh}:${mm}`;
}

function formatPlace(loc: InvitationLookup["event"]["location"]): string {
  if (!loc) return "";
  const parts = [loc.venue, loc.address, loc.city].filter(Boolean) as string[];
  return parts[0] ?? "";
}

// `Date.now()` is impure under `react-hooks/purity`, so anything that
// compares against the wall clock has to live in a state-driven hook
// that updates on a fixed cadence. We seed the first tick via
// `Promise.resolve().then(...)` (matches the deferral pattern in
// `useEvent`) so the first render doesn't have to wait 60 s for the
// expired check to settle.
function useWallClockMinute(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setNow(Date.now());
    });
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  return now;
}

function useIsExpired(iso: string): boolean {
  const target = useMemo(() => {
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t > 0 ? t : null;
  }, [iso]);
  const now = useWallClockMinute();
  if (target == null || now == null) return false;
  return target < now;
}

// Live "Залишилось 1 год / 23 хв" countdown. Updates once a minute —
// fine for a 2-hour TTL and avoids re-rendering every second.
function useExpiresIn(iso: string): string {
  const target = useMemo(() => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? null : t;
  }, [iso]);
  const now = useWallClockMinute();
  if (target == null || now == null) return "";
  const diff = target - now;
  if (diff <= 0) return "Прострочено";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `Залишилось ${mins} хв`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Залишилось ${hours} год`;
  const days = Math.round(hours / 24);
  return `Залишилось ${days} дн`;
}
