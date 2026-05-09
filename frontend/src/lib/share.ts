import type { AppEvent } from "@/data/events";

export function telegramShareUrl(event: AppEvent, baseUrl?: string) {
  const root =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : "https://svoyi.poruch");
  const url = `${root}/events/${event.id}`;
  const text = `${event.title} — ${event.date}, ${event.time}. Я йду, давай разом`;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}
