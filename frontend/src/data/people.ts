import type { AvatarTone } from "@/components/atoms/Avatar";

export interface Person {
  /** Two-letter initials (first name + surname), uppercase. */
  initial: string;
  tone: AvatarTone;
  /** First name only — used for inline lines like "з ними Тарас, Микола". */
  name: string;
  /** Surname — kept so the initials stay derivable and lists can show full names. */
  surname: string;
}

// Surnames mirror the backend seed (`backend/deployments/seed/seed.sql`)
// where possible so the same person looks identical regardless of whether
// they came from the API or from a frontend-only preview/mock.
export const PEOPLE = {
  oleh:   { initial: "ОД", tone: "sand"  as AvatarTone, name: "Олег",   surname: "Дудник" },
  taras:  { initial: "ТЛ", tone: "green" as AvatarTone, name: "Тарас",  surname: "Левченко" },
  mykola: { initial: "МК", tone: "blue"  as AvatarTone, name: "Микола", surname: "Коваль" },
  serhiy: { initial: "СТ", tone: "cream" as AvatarTone, name: "Сергій", surname: "Тарасенко" },
  andriy: { initial: "АБ", tone: "sage"  as AvatarTone, name: "Андрій", surname: "Бойко" },
  yura:   { initial: "ЮЛ", tone: "rose"  as AvatarTone, name: "Юрій",   surname: "Лисенко" },
  pavlo:  { initial: "ПД", tone: "sand"  as AvatarTone, name: "Павло",  surname: "Демʼяненко" },
  vitya:  { initial: "ВМ", tone: "blue"  as AvatarTone, name: "Віктор", surname: "Мельник" },
  iryna:  { initial: "ІР", tone: "rose"  as AvatarTone, name: "Ірина",  surname: "Романчук" },
  olha:   { initial: "ОГ", tone: "cream" as AvatarTone, name: "Ольга",  surname: "Гриценко" },
} satisfies Record<string, Person>;

export type PersonKey = keyof typeof PEOPLE;

export const peopleOf = (...keys: PersonKey[]): Person[] =>
  keys.map((k) => PEOPLE[k]);
