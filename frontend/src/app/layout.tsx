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
    <html lang="uk" className={`${inter.variable} text-size-md`}>
      <body>
        <A11yBoot />
        <SessionBoot />
        <ResponsiveStage>{children}</ResponsiveStage>
        <ToastHost />
      </body>
    </html>
  );
}
