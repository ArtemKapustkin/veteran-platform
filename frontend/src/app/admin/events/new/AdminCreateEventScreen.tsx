"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { AdminEventEditor } from "../AdminEventEditor";

/**
 * Dedicated full-screen create flow (replacing the list-page modal overlay).
 */
export function AdminCreateEventScreen() {
  const router = useRouter();
  const mounted = useMounted();
  const role = useAuthStore((s) => s.role);
  const loggedIn = useAuthStore((s) => s.loggedIn);

  useEffect(() => {
    if (!mounted) return;
    if (!loggedIn) {
      router.replace("/login?next=%2Fadmin%2Fevents%2Fnew");
      return;
    }
    if (role !== "admin") {
      router.replace("/account");
    }
  }, [mounted, loggedIn, role, router]);

  if (!mounted || role !== "admin") {
    return (
      <main
        className="bg-bg flex min-h-[100dvh] items-center justify-center"
        aria-busy="true"
      >
        <span className="text-text2" style={{ fontSize: 14 }}>
          Перевіряємо доступ…
        </span>
      </main>
    );
  }

  return (
    <AdminEventEditor
      layout="page"
      mode={{ kind: "create" }}
      onClose={() => router.push("/admin/events")}
      onSaved={async () => {
        router.push("/admin/events");
      }}
    />
  );
}
