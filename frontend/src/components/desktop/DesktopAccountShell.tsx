"use client";

import { AccountGuest } from "@/components/account/AccountGuest";
import { AccountProfile } from "@/components/account/AccountProfile";
import { Overlays } from "@/components/sheets/Overlays";
import { useAuthStore } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { DesktopNav } from "./DesktopNav";

export function DesktopAccountShell() {
  const mounted = useMounted();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const isLoggedIn = mounted && loggedIn;

  return (
    <div className="bg-bg flex flex-col" style={{ minHeight: "100vh" }}>
      <DesktopNav />
      {isLoggedIn ? <AccountProfile /> : <AccountGuest />}
      <Overlays desktop />
    </div>
  );
}
