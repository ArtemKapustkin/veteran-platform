import Link from "next/link";
import { Btn } from "@/components/atoms/Btn";
import { ArrowIcon } from "@/components/icons";
import { LandingDesktop } from "@/components/desktop/LandingDesktop";
import { ViewportSwitch } from "@/components/ViewportSwitch";

function MobileLanding() {
  return (
    <main
      className="bg-bg flex flex-col px-6 pt-10 pb-8"
      style={{ minHeight: "100dvh" }}
    >
      <div
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#1A1A1A] text-white"
        style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        сп
      </div>

      <div className="flex flex-1 flex-col justify-center px-1 text-center">
        <h1
          className="text-text m-0"
          style={{
            fontSize: 48,
            fontWeight: 600,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
          }}
        >
          Свої поруч
        </h1>

        <p
          className="text-text2 mx-auto mt-5.5 mb-0"
          style={{
            fontSize: 16,
            lineHeight: 1.55,
            fontWeight: 400,
            letterSpacing: "-0.005em",
          }}
        >
          Карта подій для ветеранів і ветеранок. Бачиш, скільки своїх уже йде —
          і йдеш не один. Запросити побратима — один тап у Telegram.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Link href="/map" aria-label="Переглянути івенти">
          <Btn
            kind="primary"
            size="lg"
            fullWidth
            iconRight={<ArrowIcon size={18} />}
            asLink
          >
            Переглянути івенти
          </Btn>
        </Link>
        <div
          className="text-text-muted flex items-center justify-center gap-2.5"
          style={{
            fontSize: 11,
            letterSpacing: "0.04em",
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
  );
}

export default function LandingPage() {
  return (
    <ViewportSwitch
      mobile={<MobileLanding />}
      desktop={<LandingDesktop />}
    />
  );
}
