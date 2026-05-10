import { Suspense } from "react";
import { LoginWizard } from "./LoginWizard";

// Dedicated veteran login + verification flow. Lives outside any other
// shell so the wizard owns its full viewport. The root layout already
// wraps everything in `ResponsiveStage`, so we just render the wizard.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginWizard />
    </Suspense>
  );
}
