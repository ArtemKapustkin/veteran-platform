"use client";

import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { TgIcon, UserIcon } from "@/components/icons";
import { useAuthStore } from "@/lib/store";

/**
 * Shown to unauthenticated visitors on /account, and as a fallback when
 * a guest lands on /saved (Збережені requires auth). Mirrors S12_AccountGuest
 * from the prototype: centered icon + copy + Telegram CTA + "Не зараз".
 */
export function AccountGuest() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const handleTgLogin = () => {
    // Stub for Telegram OAuth — flips the mocked session and drops the
    // user back into the map.
    login();
    router.push("/map");
  };

  const handleSkip = () => {
    router.push("/map");
  };

  return (
    <div className="bg-bg flex flex-1 flex-col items-center justify-center overflow-auto px-6 py-10">
      <div className="flex w-full max-w-[440px] flex-col items-center text-center">
        <div
          className="bg-primary-soft text-primary mb-5.5 flex h-[72px] w-[72px] items-center justify-center rounded-full"
          aria-hidden
        >
          <UserIcon size={36} />
        </div>
        <h1
          className="text-text m-0"
          style={{
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: "-0.025em",
          }}
        >
          Твій акаунт
        </h1>
        <p
          className="text-text2 mt-3 mb-0"
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            letterSpacing: "-0.005em",
          }}
        >
          Увійди, щоб бачити події на які ти записався, збережені і свою
          активність.
        </p>
        <div className="mt-7 flex w-full flex-col gap-2.5">
          <Btn
            kind="tg"
            size="lg"
            fullWidth
            icon={<TgIcon size={18} />}
            onClick={handleTgLogin}
          >
            Увійти через Telegram
          </Btn>
          <Btn kind="ghost" size="md" fullWidth onClick={handleSkip}>
            Не зараз
          </Btn>
        </div>
      </div>
    </div>
  );
}
