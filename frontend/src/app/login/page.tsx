"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/atoms/Btn";
import { DragHandle } from "@/components/shared/DragHandle";
import { TgIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();

  const handleTgLogin = () => {
    // Stub: in the real product this hits a Telegram OAuth flow.
    router.push("/map");
  };

  return (
    <main
      className="bg-bg relative overflow-hidden"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      {/* warm wash that previously held a faded map preview */}
      <div
        aria-hidden
        className="bg-map-bg absolute inset-0 opacity-40"
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(250,250,247,0.6) 0%, rgba(250,250,247,0.95) 60%)",
        }}
      />

      <div
        className="bg-surface absolute inset-x-0 bottom-0 box-border rounded-t-3xl px-6 pt-3.5 pb-9"
        style={{ boxShadow: "var(--shadow-sheet)" }}
      >
        <DragHandle />
        <div className="mt-3.5 mb-4 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-[20px] text-white"
            style={{
              background: "linear-gradient(180deg, #2AABEE 0%, #229ED9 100%)",
              boxShadow: "0 8px 24px rgba(34,158,217,0.28)",
            }}
          >
            <TgIcon size={30} />
          </div>
        </div>
        <h2
          className="text-text m-0 text-center"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          Заходь через Telegram
        </h2>
        <p
          className="text-text2 mx-0 mt-2.5 mb-7 text-center"
          style={{ fontSize: 15, lineHeight: 1.5 }}
        >
          Один тап. Без паролів.
          <br />
          Без зайвого.
        </p>
        <Btn
          kind="tg"
          size="lg"
          fullWidth
          icon={<TgIcon size={18} />}
          onClick={handleTgLogin}
        >
          Увійти через Telegram
        </Btn>
        <div className="mt-4 text-center">
          <Link
            href="/map"
            className="text-text2 text-sm"
            style={{ letterSpacing: "-0.005em" }}
          >
            Поки що{" "}
            <u
              style={{
                textDecorationColor: "var(--color-text-muted)",
                textDecorationThickness: 1,
                textUnderlineOffset: 3,
              }}
            >
              без входу
            </u>
          </Link>
        </div>
      </div>
    </main>
  );
}
