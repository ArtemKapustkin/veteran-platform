"use client";

import { useState } from "react";
import { EVENTS } from "@/data/events";

type SortKey = "date" | "distance";

export function DesktopHeader() {
  const [sort, setSort] = useState<SortKey>("date");

  return (
    <div className="px-7 pt-6 pb-3">
      <h1
        className="text-text m-0"
        style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em" }}
      >
        Події у Києві
      </h1>
      <div className="text-text2 mt-1.5" style={{ fontSize: 14 }}>
        {EVENTS.length} подій цього тижня
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <div
          role="tablist"
          aria-label="Сортувати"
          className="inline-flex rounded-full bg-[#F8F6F1] p-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sort === "date"}
            onClick={() => setSort("date")}
            className="rounded-full px-3.5 py-1.5"
            style={{
              fontSize: 13,
              fontWeight: 500,
              background: sort === "date" ? "#1A1A1A" : "transparent",
              color: sort === "date" ? "#fff" : "var(--color-text2)",
            }}
          >
            За датою
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sort === "distance"}
            onClick={() => setSort("distance")}
            className="rounded-full px-3.5 py-1.5"
            style={{
              fontSize: 13,
              fontWeight: 500,
              background: sort === "distance" ? "#1A1A1A" : "transparent",
              color: sort === "distance" ? "#fff" : "var(--color-text2)",
            }}
          >
            За відстанню
          </button>
        </div>
      </div>
    </div>
  );
}
