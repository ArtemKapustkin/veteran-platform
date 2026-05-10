"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill, type PillColor } from "@/components/atoms/Pill";
import { Photo } from "@/components/atoms/Photo";
import { PinIcon } from "@/components/icons";
import { CATEGORIES } from "@/data/categories";
import {
  ApiError,
  invitationsApi,
  type InvitationLookup,
} from "@/lib/api";
import { apiEventToAppEvent } from "@/lib/api/mappers";
import { useEventsStore } from "@/lib/store";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { toast } from "@/lib/useToast";

const CAT_PILL: Record<string, PillColor> = {
  sport: "green",
  yoga: "green",
  rehabilitation: "green",
  culture: "blue",
  education: "blue",
  spa: "blue",
  social: "amber",
  psychology: "amber",
  nature: "amber",
};

export function InvitationLandingScreen({ token }: { token: string }) {
  const router = useRouter();
  const requireAuth = useAuthGuard();
  const applyRegistration = useEventsStore((s) => s.applyRegistration);

  const [data, setData] = useState<InvitationLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await invitationsApi.lookup(token.trim());
      setData(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
        setData(null);
      } else {
        toast.error(
          "Не вдалось завантажити запрошення",
          e instanceof Error ? e.message : undefined,
        );
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onClaim = async () => {
    if (busy || !data?.event) return;
    if (!requireAuth({ hint: "Щоб приєднатися до групи" })) return;
    setBusy(true);
    try {
      const reg = await invitationsApi.claim(token.trim());
      applyRegistration(reg);
      toast.success("Ти в групі!", "Місце підтверджено.");
      router.push(`/events/${data.event.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error("Не вдалось приєднатися", msg);
    } finally {
      setBusy(false);
    }
  };

  const onDecline = async () => {
    if (busy || !data) return;
    if (
      !window.confirm(
        "Відмовитись? Це скасує бронювання всієї групи для організатора — місця повернуться в квоту події.",
      )
    ) {
      return;
    }
    if (!requireAuth({ hint: "Щоб відповісти на запрошення" })) return;
    setBusy(true);
    try {
      await invitationsApi.decline(token.trim());
      toast.info("Запрошення відхилено");
      await refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error("Не вдалось відправити відповідь", msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main
        className="bg-bg flex min-h-[100dvh] items-center justify-center px-5"
        aria-busy="true"
      >
        <p className="text-text2" style={{ fontSize: 15 }}>
          Завантажуємо запрошення…
        </p>
      </main>
    );
  }

  if (notFound || !data?.event) {
    return (
      <main className="bg-bg flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-text m-0" style={{ fontSize: 18, fontWeight: 600 }}>
          Запрошення недійсне
        </h1>
        <p className="text-text2 mt-2 m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Посилання прострочене або вже було використано. Попроси побратима
          надіслати нове.
        </p>
        <Link href="/map" className="mt-6">
          <Btn kind="secondary" size="md">
            До карти подій
          </Btn>
        </Link>
      </main>
    );
  }

  const ev = apiEventToAppEvent(data.event);
  const meta = CATEGORIES[data.event.category];
  const expires = new Date(data.reservation_expires_at);
  const expiresOk = Number.isFinite(expires.getTime());
  const organizer = data.invited_by_fullname?.trim() || "Побратим";

  let body: ReactNode;
  if (data.already_claimed_by_me) {
    body = (
      <>
        <p className="text-text2 m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Ти вже підтвердив це місце — переходь на сторінку події.
        </p>
        <Link href={`/events/${data.event.id}`} className="mt-4 block">
          <Btn kind="primary" size="md" fullWidth>
            Відкрити подію
          </Btn>
        </Link>
      </>
    );
  } else if (data.status === "pending") {
    body = (
      <>
        <p className="text-text2 m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Приєднайся до групи на подію. Потрібен акаунт ветерана.
          {expiresOk ? (
            <>
              {" "}
              Бронь групи активна до{" "}
              {expires.toLocaleString("uk-UA", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </>
          ) : null}
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Btn
            kind="primary"
            size="md"
            fullWidth
            loading={busy}
            onClick={() => void onClaim()}
          >
            Приєднатися до групи
          </Btn>
          <Btn
            kind="ghost"
            size="md"
            fullWidth
            disabled={busy}
            onClick={() => void onDecline()}
          >
            Відмовитись…
          </Btn>
        </div>
      </>
    );
  } else if (data.status === "declined") {
    body = (
      <p className="text-text2 m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Це запрошення було відхилено; групове бронювання могло скасуватися.
      </p>
    );
  } else {
    body = (
      <p className="text-text2 m-0" style={{ fontSize: 14, lineHeight: 1.5 }}>
        Це місце вже було підтверджено або запрошення більше не активне.
      </p>
    );
  }

  return (
    <main className="bg-bg mx-auto w-full max-w-[440px] px-5 pb-12 pt-8">
      <h1 className="text-text m-0" style={{ fontSize: 17, fontWeight: 600 }}>
        Запрошення від {organizer}
      </h1>
      <p className="text-text2 mt-1 m-0" style={{ fontSize: 13 }}>
        Група на {data.seats_in_group}{" "}
        {data.seats_in_group === 1 ? "місце" : "місця"}
      </p>

      <article
        className="border-border-soft bg-surface mt-6 overflow-hidden rounded-2xl border"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 10" }}
        >
          <Photo
            tone={ev.coverTone}
            fill
            radius={0}
            imageUrl={ev.coverImageUrl}
            alt={`Обкладинка події «${ev.title}»`}
          />
          <div className="absolute left-2.5 top-2.5">
            <Pill color={CAT_PILL[data.event.category] ?? "grey"}>
              {meta?.label ?? data.event.category}
            </Pill>
          </div>
        </div>
        <div className="px-4 py-4">
          <div
            className="text-text overflow-hidden"
            style={{
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            {ev.title}
          </div>
          <div
            className="text-text2 mt-1.5 flex items-center gap-1.5 overflow-hidden"
            style={{ fontSize: 13 }}
          >
            <PinIcon size={13} />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {ev.date} · {ev.time} · {ev.place}
            </span>
          </div>
        </div>
      </article>

      <div className="mt-6">{body}</div>

      <p className="text-text-muted mt-8 mb-0 text-center" style={{ fontSize: 12 }}>
        <Link href="/map" className="underline decoration-dotted underline-offset-2">
          Карта подій
        </Link>
      </p>
    </main>
  );
}
