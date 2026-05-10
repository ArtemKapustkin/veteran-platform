"use client";

import { Avatar, type AvatarTone } from "@/components/atoms/Avatar";
import { Btn } from "@/components/atoms/Btn";
import { TgIcon } from "@/components/icons";
import type { Community } from "@/lib/api";

const TONE_ORDER: AvatarTone[] = [
  "sand",
  "green",
  "blue",
  "rose",
  "cream",
  "sage",
];

// Same hashing trick as `attendeeToPerson`: stable colour per community based
// on the first character of its name, so revisits don't shuffle the palette.
function pickTone(seed: string): AvatarTone {
  const code = seed.codePointAt(0) ?? 0;
  return TONE_ORDER[code % TONE_ORDER.length];
}

const MONTH_GENITIVE = [
  "січня",
  "лютого",
  "березня",
  "квітня",
  "травня",
  "червня",
  "липня",
  "серпня",
  "вересня",
  "жовтня",
  "листопада",
  "грудня",
] as const;

function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `з ${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Card for a single community in the "Спільноти поруч" directory.
 *
 * The card itself is a non-link surface — the only actionable element is the
 * Telegram CTA, which opens the channel/group in a new tab. We deliberately
 * don't deep-link to a `/communities/[id]` page yet because the API only
 * exposes the same fields the list already returns.
 */
export function CommunityCard({ community }: { community: Community }) {
  const initial = (community.name.trim().charAt(0) || "С").toUpperCase();
  const tone = pickTone(initial);
  const tgLink = community.tg_channel_link ?? null;

  return (
    <article
      className="bg-surface border-border-soft flex flex-col gap-3.5 rounded-2xl border p-4 shadow-soft"
    >
      <div className="flex items-start gap-3">
        <Avatar initial={initial} tone={tone} size={44} ring="transparent" />
        <div className="min-w-0 flex-1">
          <h3
            className="text-text m-0 overflow-hidden"
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              lineHeight: 1.25,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {community.name}
          </h3>
          <div
            className="text-text2 mt-1"
            style={{ fontSize: 12, letterSpacing: "-0.005em" }}
          >
            {formatCreated(community.created_at)}
          </div>
        </div>
      </div>

      {tgLink ? (
        <a
          href={tgLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Відкрити Telegram-канал спільноти «${community.name}»`}
          className="inline-flex"
        >
          <Btn kind="tg" size="sm" icon={<TgIcon size={15} />} asLink>
            Відкрити в Telegram
          </Btn>
        </a>
      ) : (
        <span
          className="text-text-muted inline-flex items-center gap-1.5"
          style={{ fontSize: 12 }}
        >
          Telegram-посилання ще не додано
        </span>
      )}
    </article>
  );
}
