"use client";

import Link from "next/link";
import { AppHeader } from "@/components/shared/AppHeader";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { Btn } from "@/components/atoms/Btn";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { AccountGuest } from "@/components/account/AccountGuest";
import { Overlays } from "@/components/sheets/Overlays";
import { HeartIcon } from "@/components/icons";
import { useEvents } from "@/lib/useEvents";
import { useAuthStore, useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export function SavedScreen() {
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const savedIds = useEventsStore((s) => s.savedIds);
  const { events } = useEvents();
  const isLoggedIn = mounted && loggedIn;

  // Збережені requires auth — guests get the account login prompt instead
  // of an empty state they can't fill (matches the prototype's S08 fallback
  // to S12_AccountGuest).
  if (!isLoggedIn) {
    return (
      <main
        className="bg-bg relative flex flex-col overflow-hidden"
        style={{ height: "100dvh" }}
      >
        <div className="px-4 pt-3 pb-2">
          <AppHeader />
        </div>
        <AccountGuest />
        <div className="absolute inset-x-3 bottom-6 z-10">
          <BottomToolbar active="account" />
        </div>
        <Overlays />
      </main>
    );
  }

  const saved = events.filter((e) => savedIds.includes(e.id));
  const filled = saved.length > 0;

  return (
    <main
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="px-4 pt-3 pb-2">
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
          Збережені
        </h1>
        <div className="text-text2" style={{ fontSize: 13 }}>
          {filled
            ? `${saved.length} ${
                saved.length === 1 ? "подія" : saved.length < 5 ? "події" : "подій"
              }`
            : "Поки що порожньо"}
        </div>
      </div>

      {!filled ? (
        <div className="flex flex-1 flex-col items-center justify-center px-9 pb-20">
          <div
            className="mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
            style={{ background: "#FBE8E8", color: "#C04848" }}
            aria-hidden
          >
            <HeartIcon size={32} />
          </div>
          <p
            className="text-text m-0 text-center"
            style={{
              fontSize: 16,
              fontWeight: 500,
              lineHeight: 1.45,
              letterSpacing: "-0.01em",
            }}
          >
            Тут будуть події,
            <br />
            які ти зберіг.
          </p>
          <p
            className="text-text2 mt-2 text-center"
            style={{ fontSize: 14 }}
          >
            Поки що порожньо.
          </p>
          <Link href="/map" className="mt-6">
            <Btn kind="secondary" size="md" asLink>
              Подивитись карту
            </Btn>
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 pt-3 pb-28">
          <div className="flex flex-col gap-3.5">
            {saved.map((e) => (
              <EventCardV2 key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="saved" />
      </div>

      <Overlays />
    </main>
  );
}
