import { Pill, type PillColor } from "@/components/atoms/Pill";

const BADGE_COLOR: Record<string, PillColor> = {
  "Для ветеранів": "sand",
  "Адаптивне": "green",
  "Без зйомки": "grey",
  "Малий формат": "blue",
  "Безкоштовно": "amber",
  "Безкоштовно для своїх": "amber",
  "Безкоштовно для УБД": "amber",
  "Через держпрограму": "amber",
  "Знижка для ветеранів": "amber",
  "Платно": "rose",
  "Жінки-ветеранки": "rose",
  "Тільки УБД": "sand",
  "Можна з дітьми": "green",
  "Окремі зони": "grey",
  "Поруч укриття": "grey",
  "18+": "rose",
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
