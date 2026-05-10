"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  AUDIENCE_LIST,
  CATEGORIES_LIST,
  COMFORT_LIST,
  PRICE_LIST,
  RECURRENCE_LIST,
  REGIONS_LIST,
  type EventDraft,
  type FormCategoryId,
  type FormStep,
} from "./draft";
import {
  CoverPicker,
  FormChips,
  FormFieldGroup,
  FormInput,
  FormTextarea,
} from "./FormPrimitives";
import { LocationPicker } from "./LocationPicker";

type DraftSetter = Dispatch<SetStateAction<EventDraft>>;

interface StepProps {
  draft: EventDraft;
  set: DraftSetter;
}

/** Curried setter helper — `u("title")(value)` updates `draft.title`. */
function makeUpdater(set: DraftSetter) {
  return <K extends keyof EventDraft>(key: K) =>
    (val: EventDraft[K]): void =>
      set((s) => ({ ...s, [key]: val }));
}

// ─── Step 1 — Основа ─────────────────────────────────

const CATEGORY_CHIP_OPTIONS = CATEGORIES_LIST.map((c) => ({
  id: c.id,
  label: c.label,
}));

export function Step1Basic({ draft, set }: StepProps) {
  const u = makeUpdater(set);
  return (
    <div className="flex flex-col gap-6">
      <FormFieldGroup label="Обкладинка">
        <CoverPicker
          tone={draft.cover}
          imageUrl={draft.coverUrl}
          onToneChange={u("cover")}
          onImageChange={u("coverUrl")}
        />
      </FormFieldGroup>

      <FormFieldGroup label="Назва події" required htmlFor="ae-title">
        <FormInput
          id="ae-title"
          value={draft.title}
          onChange={u("title")}
          placeholder="Кінопоказ «Атлантида»"
        />
      </FormFieldGroup>

      <FormFieldGroup label="Тип події" required>
        <FormChips
          value={draft.catId}
          options={CATEGORY_CHIP_OPTIONS}
          onChange={(v) => u("catId")((v || "culture") as FormCategoryId)}
        />
      </FormFieldGroup>

      <div className="grid grid-cols-2 gap-3.5">
        <FormFieldGroup label="Дата" required htmlFor="ae-date">
          <FormInput
            id="ae-date"
            type="date"
            value={draft.date}
            onChange={u("date")}
          />
        </FormFieldGroup>
        <FormFieldGroup label="Час" required htmlFor="ae-time">
          <FormInput
            id="ae-time"
            type="time"
            value={draft.time}
            onChange={u("time")}
          />
        </FormFieldGroup>
      </div>

      <FormFieldGroup
        label="Місце"
        required
        htmlFor="ae-place"
        hint="Почни вводити адресу — підкаже з OpenStreetMap. На карті можна перетягнути точку."
      >
        <LocationPicker
          place={draft.place}
          lat={draft.lat}
          lng={draft.lng}
          onChange={(next) =>
            set((s) => ({
              ...s,
              place: next.place,
              lat: next.lat,
              lng: next.lng,
            }))
          }
          inputId="ae-place"
        />
      </FormFieldGroup>

      <FormFieldGroup label="Район Києва">
        <FormChips
          value={draft.region}
          options={REGIONS_LIST}
          onChange={u("region")}
        />
      </FormFieldGroup>
    </div>
  );
}

// ─── Step 2 — Доступ і місця ─────────────────────────

export function Step2Access({ draft, set }: StepProps) {
  const u = makeUpdater(set);
  return (
    <div className="flex flex-col gap-6">
      <div
        className="rounded-[14px] px-5 pt-5 pb-4"
        style={{
          background: "#F1F5EE",
          border: "1px solid #DEEBD8",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-primary-ink)",
            letterSpacing: "-0.005em",
            marginBottom: 4,
          }}
        >
          Місця для ветеранів — це чому ти тут
        </div>
        <p
          className="text-text2 m-0"
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            marginBottom: 18,
          }}
        >
          Цифра «квота» — те, що бачить ветеран на платформі. Скільки місць
          ти готов виділити саме для нашої спільноти.
        </p>
        <div className="grid grid-cols-2 gap-3.5">
          <FormFieldGroup label="Загальна місткість" htmlFor="ae-capacity">
            <FormInput
              id="ae-capacity"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.capacity}
              onChange={u("capacity")}
              placeholder="30"
            />
          </FormFieldGroup>
          <FormFieldGroup
            label="Квота для ветеранів"
            required
            htmlFor="ae-quota"
          >
            <FormInput
              id="ae-quota"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.quota}
              onChange={u("quota")}
              placeholder="10"
            />
          </FormFieldGroup>
        </div>
      </div>

      <FormFieldGroup label="Для кого" required>
        <FormChips
          value={draft.audience}
          options={AUDIENCE_LIST}
          onChange={u("audience")}
        />
      </FormFieldGroup>

      <FormFieldGroup
        label="Вартість"
        required
        hint="Як ветеран оплачує участь, якщо платно"
      >
        <FormChips
          value={draft.price}
          options={PRICE_LIST}
          onChange={u("price")}
        />
      </FormFieldGroup>
    </div>
  );
}

// ─── Step 3 — Деталі ─────────────────────────────────

export function Step3Details({ draft, set }: StepProps) {
  const u = makeUpdater(set);
  return (
    <div className="flex flex-col gap-6">
      <FormFieldGroup
        label="Опис події"
        hint="Без героїзації, без обовʼязкової сцени, з опцією не виступати. Поясни що буде відбуватись."
        htmlFor="ae-desc"
      >
        <FormTextarea
          id="ae-desc"
          value={draft.desc}
          onChange={u("desc")}
          placeholder="VOICES показує українську драму. Після показу — коротка розмова з режисером, без обовʼязкового мікрофона. Можна сісти ззаду й піти першим."
          rows={6}
        />
      </FormFieldGroup>

      <FormFieldGroup label="Регулярність">
        <FormChips
          value={draft.recurrence}
          options={RECURRENCE_LIST}
          onChange={u("recurrence")}
        />
      </FormFieldGroup>

      <FormFieldGroup
        label="Безпека і комфорт"
        hint="Маркери, які бачить ветеран на картці події"
      >
        <FormChips
          multi
          value={draft.comfort}
          options={COMFORT_LIST}
          onChange={u("comfort")}
        />
      </FormFieldGroup>
    </div>
  );
}

// ─── Wrapper ──────────────────────────────────────────

export function SteppedForm({
  step,
  draft,
  set,
}: {
  step: FormStep["id"];
  draft: EventDraft;
  set: DraftSetter;
}) {
  if (step === 1) return <Step1Basic draft={draft} set={set} />;
  if (step === 2) return <Step2Access draft={draft} set={set} />;
  return <Step3Details draft={draft} set={set} />;
}
