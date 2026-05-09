"use client";

import { AppHeader } from "@/components/shared/AppHeader";
import { BottomToolbar } from "@/components/shared/BottomToolbar";
import { AccountGuest } from "@/components/account/AccountGuest";
import { AccountProfile } from "@/components/account/AccountProfile";
import { Overlays } from "@/components/sheets/Overlays";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export function AccountScreen() {
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const isLoggedIn = mounted && loggedIn;

  return (
    <main
      className="bg-bg relative flex flex-col overflow-hidden"
      style={{ height: "100dvh" }}
    >
      <div className="px-4 pt-3 pb-2">
        <AppHeader />
      </div>

      {isLoggedIn ? <AccountProfile /> : <AccountGuest />}

      <div className="absolute inset-x-3 bottom-6 z-10">
        <BottomToolbar active="account" />
      </div>

      <Overlays />
    </main>
  );
}
