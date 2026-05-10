"use client";

import Link from "next/link";
import { Btn } from "@/components/atoms/Btn";
import { ArrowIcon, PhoneIcon } from "@/components/icons";
import { Overlays } from "@/components/sheets/Overlays";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { DesktopNav } from "./DesktopNav";

export function LandingDesktop() {
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  // SSR/first paint defaults to guest so the login CTA renders consistently
  // before the auth store rehydrates.
  const isLoggedIn = mounted && loggedIn;

  return (
    <div
      className="bg-bg flex flex-col"
      style={{ minHeight: "100vh" }}
    >
      <DesktopNav />
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="text-center" style={{ maxWidth: 680 }}>
          <h1
            className="text-text m-0"
            style={{
              fontSize: 88,
              fontWeight: 600,
              lineHeight: 0.98,
              letterSpacing: "-0.04em",
            }}
          >
            Свої поруч
          </h1>
          <p
            className="text-text2 mx-auto mt-7 mb-0"
            style={{
              fontSize: 21,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              maxWidth: 560,
            }}
          >
            Карта подій для ветеранів і ветеранок. Бачиш, скільки своїх уже
            йде — і йдеш не один. Запросити побратима — один тап у Telegram.
          </p>
          <div className="mt-11 flex flex-wrap justify-center gap-3">
            <Link href="/map" aria-label="Переглянути події">
              <Btn
                kind="primary"
                size="lg"
                iconRight={<ArrowIcon size={18} />}
                asLink
              >
                Переглянути події
              </Btn>
            </Link>
            {!isLoggedIn ? (
              <Link href="/login" aria-label="Увійти через SMS">
                <Btn
                  kind="secondary"
                  size="lg"
                  icon={<PhoneIcon size={16} />}
                  asLink
                >
                  Увійти через SMS
                </Btn>
              </Link>
            ) : null}
          </div>
          <div
            className="text-text-muted mt-12 flex items-center justify-center gap-2.5"
            style={{
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            <span>Мінветеранів</span>
            <span
              aria-hidden
              className="bg-text-muted block h-[3px] w-[3px] rounded-full"
            />
            <span>SKELAR Foundation</span>
          </div>
        </div>
      </main>
      <Overlays desktop />
    </div>
  );
}
