import { EventDetailViewport } from "./EventDetailViewport";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EventDetailViewport id={id} />;
}
