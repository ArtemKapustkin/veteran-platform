import { AvatarStack, type AvatarStackPerson } from "@/components/atoms/AvatarStack";
import { PlusIcon } from "@/components/icons";

function veteransLabel(count: number): string {
  if (count === 1) return "ветеран іде";
  if (count < 5) return "ветерани йдуть";
  return "ветеранів йдуть";
}

export function CounterBlock({
  count,
  names = [],
  people = [],
  beFirst = false,
  compact = false,
}: {
  count: number;
  names?: string[];
  people?: AvatarStackPerson[];
  beFirst?: boolean;
  compact?: boolean;
}) {
  if (beFirst || count === 0) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-xl"
        style={{
          padding: compact ? "8px 12px" : "14px 16px",
          background: "#FBF1E2",
        }}
      >
        <span
          aria-hidden
          className="bg-primary flex h-7 w-7 items-center justify-center rounded-full text-white"
        >
          <PlusIcon size={16} stroke="#fff" />
        </span>
        <span
          className="text-primary-ink"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          Будь першим
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl"
      style={{
        padding: compact ? "8px 12px" : "14px 14px",
        background: "#F1F5EE",
      }}
    >
      <AvatarStack people={people} size={compact ? 24 : 30} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          style={{
            color: "#1F4D34",
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          {count} {veteransLabel(count)}
        </span>
        {names.length > 0 && !compact ? (
          <span
            className="text-text2 overflow-hidden text-ellipsis whitespace-nowrap"
            style={{ fontSize: 12 }}
          >
            з ними {names.join(", ")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
