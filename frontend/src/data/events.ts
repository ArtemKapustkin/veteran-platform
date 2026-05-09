import type { Person } from "./people";
import { peopleOf } from "./people";
import type { EventCategory } from "./categories";
import type { PhotoTone } from "@/components/atoms/Photo";

export interface AppEvent {
  id: number;
  category: EventCategory;
  coverTone: PhotoTone;
  title: string;
  place: string;
  /** Localized "Пт, 15 трав" */
  date: string;
  /** Localized "19:00" */
  time: string;
  /** Walking distance, formatted "2.4 км" */
  distance: string;
  badges: string[];
  /** Number of attendees (== seats_taken in the API) */
  count: number;
  /** Total seats available (== quota in the API). Drives the SeatBar. */
  capacity: number;
  attendees: Person[];
  /** Subset of attendee names rendered after the count line */
  attendeeNames: string[];
  description: string;
  /** Real Kyiv coordinates [lng, lat] for MapLibre */
  location: { lat: number; lng: number };
  /** Empty state — "+" pin, "Будь першим" */
  beFirst?: boolean;
}

export const EVENTS: AppEvent[] = [
  {
    id: 1,
    category: "culture",
    coverTone: "cream",
    title: "Кінопоказ «Атлантида»",
    place: "Кінотеатр Жовтень, Поділ",
    date: "Пт, 15 трав",
    time: "19:00",
    distance: "2.4 км",
    badges: ["Для ветеранів", "Без зйомки"],
    count: 4,
    capacity: 30,
    attendees: peopleOf("taras", "mykola", "serhiy"),
    attendeeNames: ["Тарас", "Микола"],
    description:
      "VOICES показує українську драму про евакуацію Маріуполя. Після показу — коротка розмова з режисером, без обов’язкового мікрофона. Можна сісти ззаду й піти першим, ніхто не зачепить.",
    location: { lat: 50.4646, lng: 30.5119 }, // Жовтень, Поділ
  },
  {
    id: 2,
    category: "sport",
    coverTone: "sage",
    title: "Ранкова зала",
    place: "Ветеранський спорт 1500₴, Лівобережна",
    date: "Сб, 16 трав",
    time: "08:00",
    distance: "4.1 км",
    badges: ["Безкоштовно", "Адаптивне"],
    count: 7,
    capacity: 12,
    attendees: peopleOf("andriy", "pavlo", "taras"),
    attendeeNames: ["Андрій", "Павло"],
    description:
      "Силова й кардіо-зона під супровід тренера-ветерана. Адаптивні станції для протезів, без поспіху. Прийти можна без форми, видамо чисту майку.",
    location: { lat: 50.4500, lng: 30.6010 }, // Лівобережна
  },
  {
    id: 3,
    category: "social",
    coverTone: "sand",
    title: "Кава з побратимами",
    place: "Veteran Hub, Печерськ",
    date: "Ср, 13 трав",
    time: "18:00",
    distance: "1.6 км",
    badges: ["Малий формат", "Для ветеранів"],
    count: 12,
    capacity: 15,
    attendees: peopleOf("serhiy", "yura", "vitya"),
    attendeeNames: ["Сергій", "Юрій"],
    description:
      "Без програми, без нотаток. Просто збираємось, кожен говорить, скільки хоче. Працює правило стопки — підняв, значить відпочинок.",
    location: { lat: 50.4267, lng: 30.5447 }, // Печерськ
  },
  {
    id: 4,
    category: "culture",
    coverTone: "blue",
    title: "Виставка на Михайлівській",
    place: "Михайлівська площа",
    date: "Нд, 17 трав",
    time: "14:00",
    distance: "0.9 км",
    badges: ["Мікс"],
    count: 2,
    capacity: 50,
    attendees: peopleOf("mykola", "andriy"),
    attendeeNames: ["Микола"],
    description:
      "Просто неба — фотохроніка повернень додому. Можна обійти за 25 хвилин, лавки в тіні поруч.",
    location: { lat: 50.4575, lng: 30.5234 },
  },
  {
    id: 5,
    category: "sport",
    coverTone: "green",
    title: "Адаптивний скелелазний клуб",
    place: "BlocHaus, Лук’янівка",
    date: "Пт, 15 трав",
    time: "20:00",
    distance: "3.2 км",
    badges: ["Адаптивне"],
    count: 3,
    capacity: 8,
    attendees: peopleOf("taras", "pavlo", "yura"),
    attendeeNames: ["Тарас", "Павло"],
    description:
      "Болдеринг із інструктором, який працював з протезистами в Lviv Climbing. Можна вперше — стіна 4а під ваш темп.",
    location: { lat: 50.4692, lng: 30.4878 }, // Лук'янівка
  },
  {
    id: 6,
    category: "sport",
    coverTone: "rose",
    title: "Бойовий хортинг для ветеранок",
    place: "Зал «Сила», Святошин",
    date: "Чт, 14 трав",
    time: "19:00",
    distance: "6.0 км",
    badges: ["Жінки-ветеранки"],
    count: 5,
    capacity: 10,
    attendees: peopleOf("iryna", "olha", "iryna"),
    attendeeNames: ["Ірина"],
    description:
      "Закрита група — лише жінки-ветеранки. Тренер працювала з 47-ою. Без чоловіків у залі, можна без форми.",
    location: { lat: 50.4577, lng: 30.3764 }, // Святошин
  },
  {
    id: 7,
    category: "culture",
    coverTone: "sand",
    title: "Концерт «ОЕ»",
    place: "Stereo Plaza",
    date: "Нд, 17 трав",
    time: "20:00",
    distance: "5.8 км",
    badges: ["Мікс"],
    count: 0,
    capacity: 200,
    attendees: [],
    attendeeNames: [],
    description:
      "Великий концерт. Поки що ніхто зі своїх не записався — будь першим, з’явиться група для квитків.",
    location: { lat: 50.3978, lng: 30.6266 }, // Stereo Plaza, Харківське шосе
    beFirst: true,
  },
  {
    id: 8,
    category: "social",
    coverTone: "cream",
    title: "Лекція з реінтеграції",
    place: "УВФ, Хрещатик",
    date: "Вт, 12 трав",
    time: "17:00",
    distance: "1.2 км",
    badges: ["Для ветеранів"],
    count: 8,
    capacity: 25,
    attendees: peopleOf("serhiy", "andriy", "vitya"),
    attendeeNames: ["Сергій", "Андрій"],
    description:
      "Психолог фонду розкаже про адаптацію після служби — короткий блок 40 хв і питання. Можна піти у будь-який момент.",
    location: { lat: 50.4467, lng: 30.5219 }, // Хрещатик
  },
];

export const KYIV_CENTER = { lat: 50.4501, lng: 30.5234 };

export const getEventById = (id: number | string | undefined) => {
  if (id == null) return undefined;
  const numeric = typeof id === "string" ? parseInt(id, 10) : id;
  return EVENTS.find((e) => e.id === numeric);
};
