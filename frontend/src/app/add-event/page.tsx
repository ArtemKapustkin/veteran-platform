import type { Metadata } from "next";
import { AddEventEntry } from "./AddEventEntry";

export const metadata: Metadata = {
  title: "Додати подію — Свої поруч",
  description:
    "Форма для організацій: опубліковуй події з квотами для ветеранів. Зʼявляється на карті після апруву.",
};

export default function AddEventPage() {
  return <AddEventEntry />;
}
