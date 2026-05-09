"use client";

import { useRouter } from "next/navigation";
import { FilterIcon, MicIcon, PinIcon, SearchIcon } from "@/components/icons";

export function DesktopFilterBar() {
  const router = useRouter();

  const onFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("filters", "1");
    router.push(url.pathname + url.search, { scroll: false });
  };

  return (
    <div
      className="border-border-soft flex flex-shrink-0 items-center gap-2.5 border-b bg-white px-7 pt-4.5 pb-3"
    >
      <div
        className="text-text flex items-center gap-2 rounded-[10px] bg-[#F8F6F1] px-3.5 py-2.5"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        <PinIcon size={15} />
        Київ + 20 км
      </div>
      <label
        className="text-text-muted flex flex-1 items-center gap-2.5 rounded-[10px] bg-[#F8F6F1] px-3.5 py-2.5"
        style={{ fontSize: 14 }}
      >
        <SearchIcon size={16} />
        <input
          type="search"
          placeholder="Що шукаєш? Можна голосом"
          aria-label="Пошук подій"
          className="placeholder:text-text-muted text-text flex-1 bg-transparent outline-none"
        />
        <MicIcon size={16} />
      </label>
      <button
        type="button"
        onClick={onFilters}
        className="text-text flex items-center gap-2 rounded-[10px] bg-[#F8F6F1] px-4 py-2.5 hover:brightness-95"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        <FilterIcon size={15} />
        Фільтри
      </button>
    </div>
  );
}
