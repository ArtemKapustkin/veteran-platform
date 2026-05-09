import Link from "next/link";
import { Btn } from "@/components/atoms/Btn";
import { ArrowIcon } from "@/components/icons";
import { DesktopNav } from "./DesktopNav";

export function LandingDesktop() {
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
          <div className="mt-11 flex justify-center">
            <Link href="/map" aria-label="Переглянути івенти">
              <Btn
                kind="primary"
                size="lg"
                iconRight={<ArrowIcon size={18} />}
                asLink
              >
                Переглянути івенти
              </Btn>
            </Link>
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
    </div>
  );
}
