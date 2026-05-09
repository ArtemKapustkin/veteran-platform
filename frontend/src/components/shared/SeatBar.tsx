function leftLabel(left: number): string {
  if (left === 0) return "Місць немає";
  if (left <= 3) return `Залишилось ${left}`;
  return "Місця";
}

export function SeatBar({
  taken,
  capacity,
  compact = false,
}: {
  taken: number;
  capacity: number;
  compact?: boolean;
}) {
  const left = Math.max(0, capacity - taken);
  const pct = Math.min(100, Math.round((taken / capacity) * 100));
  const fillColor =
    pct >= 90 ? "#E4634D" : pct >= 70 ? "#E89B4D" : "var(--color-primary)";

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span
          className="text-text2"
          style={{ fontSize: compact ? 12 : 13, fontWeight: 500 }}
        >
          {leftLabel(left)}
        </span>
        <span
          className="text-text"
          style={{
            fontSize: compact ? 12 : 13,
            fontWeight: 600,
            letterSpacing: "-0.005em",
          }}
        >
          {taken}{" "}
          <span className="text-text-muted" style={{ fontWeight: 500 }}>
            з {capacity}
          </span>
        </span>
      </div>
      <div
        className="overflow-hidden rounded-[3px] bg-[#EFEFEC]"
        style={{ height: compact ? 4 : 5 }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={taken}
        aria-label={`Зайнято ${taken} з ${capacity} місць`}
      >
        <div
          className="h-full rounded-[3px] transition-[width] duration-300"
          style={{ width: `${pct}%`, background: fillColor }}
        />
      </div>
    </div>
  );
}
