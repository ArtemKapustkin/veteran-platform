import { notFound } from "next/navigation";
import { EVENTS, getEventById } from "@/data/events";
import { EventDetailViewport } from "./EventDetailViewport";

export function generateStaticParams() {
  return EVENTS.map((e) => ({ id: String(e.id) }));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) notFound();
  return <EventDetailViewport event={event} />;
}
