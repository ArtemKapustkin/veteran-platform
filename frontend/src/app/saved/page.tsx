import { Suspense } from "react";
import { SavedScreen } from "./SavedScreen";
import { DesktopSavedShell } from "@/components/desktop/DesktopSavedShell";
import { ViewportSwitch } from "@/components/ViewportSwitch";

export default function SavedPage() {
  return (
    <Suspense fallback={null}>
      <ViewportSwitch
        mobile={<SavedScreen />}
        desktop={<DesktopSavedShell />}
      />
    </Suspense>
  );
}
