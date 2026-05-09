import { Suspense } from "react";
import { AccountScreen } from "./AccountScreen";
import { DesktopAccountShell } from "@/components/desktop/DesktopAccountShell";
import { ViewportSwitch } from "@/components/ViewportSwitch";

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <ViewportSwitch
        mobile={<AccountScreen />}
        desktop={<DesktopAccountShell />}
      />
    </Suspense>
  );
}
