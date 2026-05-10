import { InvitationLandingScreen } from "./InvitationLandingScreen";

// Public landing for a Telegram-share invitation. Renders without auth
// so a recipient can preview the event before signing in; the claim
// action below the preview gates on `useAuthGuard()`.
export const dynamic = "force-dynamic";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitationLandingScreen token={token} />;
}
