import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminVerificationsScreen } from "./AdminVerificationsScreen";

export const metadata: Metadata = {
  title: "Адмін · Верифікації — Свої поруч",
  description:
    "Ручний розгляд документів ветеранів, які не пройшли AI-перевірку.",
  robots: { index: false, follow: false },
};

export default function AdminVerificationsPage() {
  return (
    <Suspense fallback={null}>
      <AdminVerificationsScreen />
    </Suspense>
  );
}
