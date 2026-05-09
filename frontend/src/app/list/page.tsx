import { Suspense } from "react";
import { ListScreen } from "./ListScreen";
import { DesktopMapShell } from "@/components/desktop/DesktopMapShell";
import { ViewportSwitch } from "@/components/ViewportSwitch";

export default function ListPage() {
  return (
    <Suspense fallback={null}>
      <ViewportSwitch
        mobile={<ListScreen />}
        desktop={<DesktopMapShell listOnly />}
      />
    </Suspense>
  );
}
