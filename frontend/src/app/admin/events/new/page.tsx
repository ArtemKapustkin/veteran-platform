import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCreateEventScreen } from "./AdminCreateEventScreen";

export const metadata: Metadata = {
  title: "Створити подію — Адмін — Свої поруч",
  description: "Створення нової події в адмін-панелі.",
  robots: { index: false, follow: false },
};

export default function AdminNewEventPage() {
  return (
    <Suspense fallback={null}>
      <AdminCreateEventScreen />
    </Suspense>
  );
}
