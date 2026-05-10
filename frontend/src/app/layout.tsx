import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ResponsiveStage } from "@/components/ResponsiveStage";
import { A11yBoot } from "@/components/A11yBoot";
import { SessionBoot } from "@/components/SessionBoot";
import { ToastHost } from "@/components/atoms/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Свої поруч",
  description:
    "Карта подій для ветеранів. Поруч уже йдуть свої — один тап і ти не один.",
  applicationName: "Свої поруч",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAFAF7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The text-size-md class is a static fallback for the very first
    // server-rendered byte before A11yBoot's beforeInteractive script swaps in
    // the persisted/OS-derived size class. `suppressHydrationWarning`
    // tells React the class delta on <html> is intentional — same
    // pattern used by next-themes etc.
    <html
      lang="uk"
      className={`${inter.variable} text-size-md`}
      suppressHydrationWarning
    >
      <body>
        <A11yBoot />
        <SessionBoot />
        {/* Skip-to-content link for keyboard users — visible only on focus,
            jumps past the header/nav into the page's <main> on every route. */}
        <a href="#main-content" className="a11y-skip-link">
          Перейти до подій
        </a>
        <ResponsiveStage>{children}</ResponsiveStage>
        <ToastHost />
      </body>
    </html>
  );
}
