"use client";

import { useMemo, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { CheckIcon, ShareIcon, TgIcon } from "@/components/icons";
import type { RegistrationCompanion } from "@/lib/api";
import { toast } from "@/lib/useToast";

// Single companion slot, used by both the post-create share view in
// `GroupRegisterSheet` and the persistent organizer panel on the
// event detail screen. The status drives the layout:
//
//   - pending  → URL preview + Telegram share + Copy buttons
//   - confirmed → name (or fallback) + green "Прийнято" badge
//   - declined  → muted "Відхилив(ла)" badge
//   - expired-on-cancel  → handled by the parent (panel hides itself)
//
// `inviteText` is the message body we pass to Telegram's share-url
// endpoint; the parent computes it from the event title so the copy
// stays in one place.

export interface CompanionInviteRowProps {
  index: number;
  companion: RegistrationCompanion;
  inviteText: string;
}

export function CompanionInviteRow({
  index,
  companion,
  inviteText,
}: CompanionInviteRowProps) {
  const [copied, setCopied] = useState(false);

  // Build the absolute URL on the client so we don't need the backend
  // to know about the SPA origin (mobile preview, dev tunnels, etc.).
  // SSR returns an empty string; this row only renders inside a
  // client-only modal/panel so SSR never sees it in practice.
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !companion.invite_token) return "";
    return `${window.location.origin}/invitations/${encodeURIComponent(companion.invite_token)}`;
  }, [companion.invite_token]);

  const tgHref = useMemo(() => {
    if (!shareUrl) return "";
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(inviteText);
    return `https://t.me/share/url?url=${u}&text=${t}`;
  }, [shareUrl, inviteText]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Не вдалось скопіювати", "Спробуй вручну з адресного рядка.");
    }
  };

  const fullname = companion.fullname?.trim();
  const headline =
    companion.status === "confirmed" && fullname
      ? fullname
      : `Побратим #${index}`;

  return (
    <div className="border-border-soft flex flex-col gap-2 rounded-[10px] border bg-white px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-text" style={{ fontSize: 13.5, fontWeight: 600 }}>
          {headline}
        </span>
        <StatusBadge status={companion.status} />
      </div>

      {companion.status === "pending" ? (
        <>
          <div
            className="text-text2 truncate rounded-[8px] bg-[var(--color-bg)] px-2.5 py-1.5"
            style={{ fontSize: 12, fontFamily: "ui-monospace, monospace" }}
            title={shareUrl}
          >
            {shareUrl || "—"}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn
              kind="tg"
              size="sm"
              icon={<TgIcon size={15} />}
              className="flex-1"
              onClick={() => {
                if (!tgHref) return;
                window.open(tgHref, "_blank", "noopener,noreferrer");
              }}
            >
              Поділитись у Telegram
            </Btn>
            <Btn
              kind="secondary"
              size="sm"
              icon={<ShareIcon size={15} />}
              onClick={handleCopy}
            >
              {copied ? "Скопійовано" : "Копіювати"}
            </Btn>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: RegistrationCompanion["status"] }) {
  if (status === "confirmed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
        style={{
          background: "#E8F6EF",
          color: "#0E6E45",
          fontSize: 11.5,
          fontWeight: 600,
        }}
      >
        <CheckIcon size={12} />
        Прийнято
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
        style={{
          background: "#F5EBE6",
          color: "#9A4A2A",
          fontSize: 11.5,
          fontWeight: 600,
        }}
      >
        Відхилив(ла)
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{
        background: "#FFF4E2",
        color: "#7A4A0A",
        fontSize: 11.5,
        fontWeight: 600,
      }}
    >
      Очікує
    </span>
  );
}
