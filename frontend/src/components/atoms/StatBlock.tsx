import type { ReactNode } from "react";

/**
 * Compact stat tile used in the account stats strip
 * (Записаний / Уже відвідав / Збережено).
 */
export function StatBlock({
  value,
  label,
}: {
  value: ReactNode;
  label: string;
}) {
  return (
    <div
      className="border-border-soft rounded-2xl border bg-white px-4.5 py-4"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div
        className="text-text"
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        className="text-text2 mt-1.5"
        style={{ fontSize: 12, letterSpacing: "-0.005em" }}
      >
        {label}
      </div>
    </div>
  );
}
