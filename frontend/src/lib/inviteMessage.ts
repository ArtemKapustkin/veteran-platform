import type { AppEvent } from "@/data/events";

// Composes the message body that gets pre-filled in Telegram when the
// organizer taps "Поділитись у Telegram" on a companion's slot.
//
// Casual tone on purpose — this lands in a private chat with a
// buddy, not a marketing channel. Keep line breaks tight; the share
// row appends the URL on its own line right after the call to
// action, so the final Telegram preview reads as:
//
//   Здоров.
//   В Пт «Атлантида» — Жовтень, 19:00.
//   Я піду, поруч буде декілька свої.
//   Пішли з нами?
//   https://app/invitations/{token}
export function buildInviteText(event: AppEvent): string {
  // `event.date` is already localized as "Пт, 15 трав"; we want just
  // the weekday abbreviation for the casual one-liner. Falls back to
  // the full string when there's no comma (defensive — the formatter
  // always emits one today).
  const dayAbbr = event.date.split(",")[0]?.trim() || event.date;
  return [
    "Здоров.",
    `В ${dayAbbr} «${event.title}» — ${event.place}, ${event.time}.`,
    "Я піду, поруч буде декілька свої.",
    "Пішли з нами?",
  ].join("\n");
}
