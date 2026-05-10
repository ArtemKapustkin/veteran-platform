import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminEventsScreen } from "./AdminEventsScreen";

export const metadata: Metadata = {
  title: "Адмін · Події — Свої поруч",
  description: "Модерація та керування подіями: створення, редагування, видалення.",
  robots: { index: false, follow: false },
};

export default function AdminEventsPage() {
  return (
    <Suspense fallback={null}>
      <AdminEventsScreen />
    </Suspense>
  );
}
