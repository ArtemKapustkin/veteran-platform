import { Suspense } from "react";
import { MapScreen } from "./MapScreen";
import { DesktopMapShell } from "@/components/desktop/DesktopMapShell";
import { ViewportSwitch } from "@/components/ViewportSwitch";

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <ViewportSwitch
        mobile={<MapScreen />}
        desktop={<DesktopMapShell />}
      />
    </Suspense>
  );
}
