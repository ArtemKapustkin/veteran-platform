import type { AvatarTone } from "@/components/atoms/Avatar";

export interface Person {
  initial: string;
  tone: AvatarTone;
  name: string;
}

export const PEOPLE = {
  oleh:   { initial: "О", tone: "sand"  as AvatarTone, name: "Олег" },
  taras:  { initial: "Т", tone: "green" as AvatarTone, name: "Тарас" },
  mykola: { initial: "М", tone: "blue"  as AvatarTone, name: "Микола" },
  serhiy: { initial: "С", tone: "cream" as AvatarTone, name: "Сергій" },
  andriy: { initial: "А", tone: "sage"  as AvatarTone, name: "Андрій" },
  yura:   { initial: "Ю", tone: "rose"  as AvatarTone, name: "Юрій" },
  pavlo:  { initial: "П", tone: "sand"  as AvatarTone, name: "Павло" },
  vitya:  { initial: "В", tone: "blue"  as AvatarTone, name: "Віктор" },
  iryna:  { initial: "І", tone: "rose"  as AvatarTone, name: "Ірина" },
  olha:   { initial: "О", tone: "cream" as AvatarTone, name: "Ольга" },
} satisfies Record<string, Person>;

export type PersonKey = keyof typeof PEOPLE;

export const peopleOf = (...keys: PersonKey[]): Person[] =>
  keys.map((k) => PEOPLE[k]);
