export type EventCategory = "sport" | "culture" | "social";

export interface CategoryMeta {
  /** css color (matches the design token swatches) */
  color: string;
  /** logical name for the pin token */
  pinColor: "green" | "blue" | "amber";
  label: string;
}

export const CATEGORIES: Record<EventCategory, CategoryMeta> = {
  sport:   { color: "#34D399", pinColor: "green", label: "Спорт" },
  culture: { color: "#60A5FA", pinColor: "blue",  label: "Культура" },
  social:  { color: "#F59E0B", pinColor: "amber", label: "Соціальне" },
};
