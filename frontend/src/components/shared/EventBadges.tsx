import { Pill, type PillColor } from "@/components/atoms/Pill";

const BADGE_COLOR: Record<string, PillColor> = {
  "Для ветеранів": "sand",
  "Адаптивне": "green",
  "Без зйомки": "grey",
  "Малий формат": "blue",
  "Безкоштовно": "amber",
  "Жінки-ветеранки": "rose",
  "Мікс": "grey",
};

export function EventBadges({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => (
        <Pill key={`${b}-${i}`} color={BADGE_COLOR[b] ?? "grey"}>
          {b}
        </Pill>
      ))}
    </div>
  );
}
