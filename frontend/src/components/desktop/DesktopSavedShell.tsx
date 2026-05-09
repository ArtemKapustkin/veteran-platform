"use client";

import Link from "next/link";
import { Btn } from "@/components/atoms/Btn";
import { EventCardV2 } from "@/components/shared/EventCardV2";
import { HeartIcon } from "@/components/icons";
import { DesktopNav } from "./DesktopNav";
import { Overlays } from "@/components/sheets/Overlays";
import { EVENTS } from "@/data/events";
import { useEventsStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export function DesktopSavedShell() {
  const mounted = useMounted();
  const savedIds = useEventsStore((s) => s.savedIds);
  const saved = mounted ? EVENTS.filter((e) => savedIds.includes(e.id)) : [];
  const filled = saved.length > 0;

  return (
    <div className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}>
      <DesktopNav />
      <main
        className="mx-auto w-full px-20 py-10"
        style={{ maxWidth: 1280 }}
      >
        <h1
          className="text-text m-0"
          style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em" }}
        >
          Збережені
        </h1>
        <div className="text-text2 mt-1.5" style={{ fontSize: 14 }}>
          {filled
            ? `${saved.length} ${
                saved.length === 1
                  ? "подія"
                  : saved.length < 5
                    ? "події"
                    : "подій"
              }`
            : "Поки що порожньо"}
        </div>

        {filled ? (
          <div
            className="mt-6 grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gridAutoRows: "min-content",
            }}
          >
            {saved.map((e) => (
              <EventCardV2 key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="text-text2 mt-20 text-center">
            <div
              className="mb-4.5 inline-flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: "#FBE8E8", color: "#C04848" }}
              aria-hidden
            >
              <HeartIcon size={36} />
            </div>
            <div
              className="text-text"
              style={{ fontSize: 18, fontWeight: 500 }}
            >
              Тут будуть події, які ти зберіг
            </div>
            <div className="text-text2 mt-1.5" style={{ fontSize: 14 }}>
              Поки що порожньо
            </div>
            <Link href="/map" className="mt-5 inline-block">
              <Btn kind="secondary" size="md" asLink>
                Подивитись карту
              </Btn>
            </Link>
          </div>
        )}
      </main>
      <Overlays desktop />
    </div>
  );
}
