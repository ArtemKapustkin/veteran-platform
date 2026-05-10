import { Suspense } from "react";
import { CommunitiesScreen } from "./CommunitiesScreen";
import { DesktopCommunitiesShell } from "@/components/desktop/DesktopCommunitiesShell";
import { ViewportSwitch } from "@/components/ViewportSwitch";

export default function CommunitiesPage() {
  return (
    <Suspense fallback={null}>
      <ViewportSwitch
        mobile={<CommunitiesScreen />}
        desktop={<DesktopCommunitiesShell />}
      />
    </Suspense>
  );
}
