"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn } from "@/components/atoms/Btn";
import { Pill } from "@/components/atoms/Pill";
import { EventPagePreview } from "@/components/add-event/EventPagePreview";
import { LocationPicker } from "@/components/add-event/LocationPicker";
import { ArrowIcon, BackIcon, CloseIcon } from "@/components/icons";
import {
  AdminEventStepper,
  type AdminWizardStepDef,
} from "./AdminEventStepper";
import { ApiError, eventsApi } from "@/lib/api";
import type {
  AccessibilityTag,
  ApiEvent,
  ApiEventCategory,
  CostTier,
  EventCreatePayload,
  EventFormat,
  EventRepeat,
  EventStatus,
  EventUpdatePayload,
  ForWhom,
  KyivDistrict,
  Location as ApiLocation,
} from "@/lib/api/types";
import { toast } from "@/lib/useToast";
import { adminFormToPreviewDraft } from "./adminFormToPreviewDraft";

// Static option lists. Mirror the validators in
// `backend/internal/http_handler/event_handler.go` so a submission can't
// be authored client-side that the server would reject.

const CATEGORY_OPTS: { id: ApiEventCategory; label: string }[] = [
  { id: "spa", label: "СПА і відновлення" },
  { id: "sport", label: "Спорт" },
  { id: "yoga", label: "Йога і медитація" },
  { id: "culture", label: "Культура" },
  { id: "education", label: "Навчання" },
  { id: "nature", label: "Природа і тури" },
  { id: "psychology", label: "Психологічна підтримка" },
  { id: "social", label: "Зустрічі і спілкування" },
  { id: "rehabilitation", label: "Реабілітація" },
];

const FORMAT_OPTS: { id: EventFormat; label: string }[] = [
  { id: "offline", label: "Офлайн" },
  { id: "online", label: "Онлайн" },
  { id: "hybrid", label: "Гібрид" },
];

const REPEAT_OPTS: { id: EventRepeat; label: string }[] = [
  { id: "once", label: "Одноразова" },
  { id: "weekly", label: "Щотижня" },
  { id: "biweekly", label: "Раз на 2 тижні" },
  { id: "monthly", label: "Щомісяця" },
];

const FOR_WHOM_OPTS: { id: ForWhom; label: string }[] = [
  { id: "veterans", label: "Ветерани" },
  { id: "female_veterans", label: "Жінки-ветеранки" },
  { id: "male_veterans", label: "Чоловіки-ветерани" },
  { id: "families", label: "Родини" },
  { id: "children", label: "Діти" },
  { id: "fallen_families", label: "Родини загиблих" },
  { id: "active_military", label: "Діючі військові" },
  { id: "veterans_and_families", label: "Ветерани і родини" },
  { id: "open", label: "Відкрита" },
];

const COST_OPTS: { id: CostTier; label: string }[] = [
  { id: "free_for_all", label: "Безкоштовно для всіх" },
  { id: "free_for_veterans_and_families", label: "Безкоштовно для ветеранів і родин" },
  { id: "free_for_ubd", label: "Безкоштовно для УБД" },
  { id: "free_via_state_program", label: "Через держпрограму" },
  { id: "discount_for_veterans", label: "Знижка для ветеранів" },
  { id: "paid", label: "Платно" },
];

const ACCESSIBILITY_OPTS: { id: AccessibilityTag; label: string }[] = [
  { id: "is_accessible", label: "Адаптивний простір" },
  { id: "no_shooting", label: "Без зйомки" },
  { id: "kids_allowed", label: "Можна з дітьми" },
  { id: "separate_zones", label: "Окремі зони" },
  { id: "shelter_nearby", label: "Поруч укриття" },
  { id: "age_18_plus", label: "18+" },
];

const DISTRICT_OPTS: { id: KyivDistrict; label: string }[] = [
  { id: "holosiivskyi", label: "Голосіївський" },
  { id: "obolonskyi", label: "Оболонський" },
  { id: "pecherskyi", label: "Печерський" },
  { id: "podilskyi", label: "Подільський" },
  { id: "sviatoshynskyi", label: "Святошинський" },
  { id: "solomianskyi", label: "Солом’янський" },
  { id: "shevchenkivskyi", label: "Шевченківський" },
  { id: "darnytskyi", label: "Дарницький" },
  { id: "desnianskyi", label: "Деснянський" },
  { id: "dniprovskyi", label: "Дніпровський" },
];

const ADMIN_STATUS_OPTS: { id: EventStatus; label: string }[] = [
  { id: "published", label: "Опублікувати одразу" },
  { id: "draft", label: "Зберегти як чернетку" },
  { id: "pending_approval", label: "Залишити на модерації" },
];

const ADMIN_STEPS_EDIT = [
  { id: 1, label: "Основа", hint: "Назва й тематика" },
  { id: 2, label: "Розклад", hint: "Час і квота" },
  { id: 3, label: "Вартість", hint: "Тариф і ціни" },
  { id: 4, label: "Локація", hint: "Місто й адреса" },
  { id: 5, label: "Деталі", hint: "Доступність і обкладинка" },
] as const satisfies readonly AdminWizardStepDef[];

const ADMIN_STEP_PUBLISH: AdminWizardStepDef = {
  id: 6,
  label: "Публікація",
  hint: "Статус після створення",
};

function maxWizardStep(isEdit: boolean): number {
  return isEdit ? ADMIN_STEPS_EDIT.length : ADMIN_STEPS_EDIT.length + 1;
}

// Editor form state — flat strings keep the controlled inputs simple. We
// convert to the typed payload at submit time.

interface FormState {
  title: string;
  description: string;
  category: ApiEventCategory;
  format: EventFormat;
  repeat: EventRepeat;
  forWhom: ForWhom;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`. */
  time: string;
  /** ISO `YYYY-MM-DD`, blank when ends_at is unset. */
  endDate: string;
  endTime: string;
  quota: string;
  costTier: CostTier;
  priceUah: string;
  veteranPriceUah: string;
  verifiedOnly: boolean;
  accessibility: Set<AccessibilityTag>;
  city: string;
  district: KyivDistrict | "";
  address: string;
  venue: string;
  lat: string;
  lng: string;
  coverImageUrl: string;
  status: EventStatus;
}

function emptyForm(): FormState {
  return {
    title: "",
    description: "",
    category: "social",
    format: "offline",
    repeat: "once",
    forWhom: "veterans",
    date: "",
    time: "",
    endDate: "",
    endTime: "",
    quota: "",
    costTier: "free_for_all",
    priceUah: "",
    veteranPriceUah: "",
    verifiedOnly: false,
    accessibility: new Set(),
    city: "Київ",
    district: "",
    address: "",
    venue: "",
    lat: "",
    lng: "",
    coverImageUrl: "",
    status: "published",
  };
}

function fromEvent(ev: ApiEvent): FormState {
  const starts = new Date(ev.starts_at);
  const ends = ev.ends_at ? new Date(ev.ends_at) : null;
  return {
    title: ev.title,
    description: ev.description ?? "",
    category: ev.category,
    format: ev.format,
    repeat: ev.repeat ?? "once",
    forWhom: ev.for_whom,
    date: toDateInput(starts),
    time: toTimeInput(starts),
    endDate: ends ? toDateInput(ends) : "",
    endTime: ends ? toTimeInput(ends) : "",
    quota: String(ev.quota),
    costTier: ev.cost?.tier ?? "free_for_all",
    priceUah: ev.cost?.price_uah != null ? String(ev.cost.price_uah) : "",
    veteranPriceUah:
      ev.cost?.veteran_price_uah != null ? String(ev.cost.veteran_price_uah) : "",
    verifiedOnly: ev.verified_only,
    accessibility: new Set(ev.accessibility_tags ?? []),
    city: ev.location?.city ?? "",
    district: (ev.location?.district as KyivDistrict | undefined) ?? "",
    address: ev.location?.address ?? "",
    venue: ev.location?.venue ?? "",
    lat: ev.location?.lat != null ? String(ev.location.lat) : "",
    lng: ev.location?.lng != null ? String(ev.location.lng) : "",
    coverImageUrl: ev.cover_image_url ?? "",
    status: ev.status,
  };
}

export function AdminEventEditor({
  layout = "dialog",
  mode,
  onClose,
  onSaved,
}: {
  layout?: "dialog" | "page";
  mode: { kind: "create" } | { kind: "edit"; event: ApiEvent };
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() =>
    mode.kind === "edit" ? fromEvent(mode.event) : emptyForm(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);

  const isDialog = layout === "dialog";

  // Lock background scroll while the dialog is open.
  useEffect(() => {
    if (!isDialog) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDialog]);

  // Esc closes the editor. Unlike a Sheet we don't bother with a focus
  // trap — the dialog is short and the form fields are all reachable.
  useEffect(() => {
    if (!isDialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDialog, onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const isEdit = mode.kind === "edit";
  const title = isEdit ? "Редагувати подію" : "Створити подію";

  const wizardSteps = useMemo(
    () =>
      isEdit
        ? ADMIN_STEPS_EDIT
        : ([...ADMIN_STEPS_EDIT, ADMIN_STEP_PUBLISH] as const),
    [isEdit],
  );

  const wizardStepMax = maxWizardStep(isEdit);
  const isLastWizardStep = wizardStep === wizardStepMax;

  const validation = useMemo(() => validate(form, isEdit), [form, isEdit]);

  const goNextStep = () => {
    const stepErr = validateWizardStep(wizardStep, form, isEdit);
    if (stepErr) {
      setError(stepErr);
      return;
    }
    setError(null);
    setWizardStep((s) => Math.min(s + 1, wizardStepMax));
  };

  const goPrevStep = () => {
    setError(null);
    setWizardStep((s) => Math.max(1, s - 1));
  };

  const previewDraft = useMemo(() => {
    if (isDialog) return null;
    return adminFormToPreviewDraft(form);
  }, [form, isDialog]);

  const onSubmit = async () => {
    if (validation.errors.length > 0) {
      setError(validation.errors[0]);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode.kind === "create") {
        const payload = buildCreatePayload(form);
        await eventsApi.adminCreate(payload);
        toast.success("Подію створено");
      } else {
        const payload = buildUpdatePayload(form, mode.event);
        await eventsApi.adminUpdate(mode.event.id, payload);
        toast.success("Зміни збережено");
      }
      await onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        const detail = e.details
          ? Object.values(e.details).join("\n")
          : e.message;
        setError(detail || "Не вдалось зберегти");
      } else {
        setError(e instanceof Error ? e.message : "Не вдалось зберегти");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formEl = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isLastWizardStep) void onSubmit();
        else goNextStep();
      }}
      className="flex flex-col gap-5"
    >
            {wizardStep === 1 ? (
            <Section title="Основа">
              <Field label="Назва" required>
                <Input
                  value={form.title}
                  onChange={(v) => set("title", v)}
                  placeholder="Йога-ретрит у парку"
                  maxLength={80}
                />
              </Field>
              <Field label="Опис" hint="До 150 символів — короткий тізер картки">
                <Textarea
                  value={form.description}
                  onChange={(v) => set("description", v)}
                  rows={3}
                  maxLength={150}
                />
              </Field>
              <Grid cols={2}>
                <Field label="Категорія" required>
                  <Select
                    value={form.category}
                    onChange={(v) => set("category", v as ApiEventCategory)}
                    options={CATEGORY_OPTS}
                  />
                </Field>
                <Field label="Для кого" required>
                  <Select
                    value={form.forWhom}
                    onChange={(v) => set("forWhom", v as ForWhom)}
                    options={FOR_WHOM_OPTS}
                  />
                </Field>
              </Grid>
              <Grid cols={2}>
                <Field label="Формат" required>
                  <Select
                    value={form.format}
                    onChange={(v) => set("format", v as EventFormat)}
                    options={FORMAT_OPTS}
                  />
                </Field>
                <Field label="Повторюваність">
                  <Select
                    value={form.repeat}
                    onChange={(v) => set("repeat", v as EventRepeat)}
                    options={REPEAT_OPTS}
                  />
                </Field>
              </Grid>
            </Section>
            ) : null}

            {wizardStep === 2 ? (
            <Section title="Дата і місця">
              <Grid cols={3}>
                <Field label="Дата старту" required>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(v) => set("date", v)}
                  />
                </Field>
                <Field label="Час старту" required>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(v) => set("time", v)}
                  />
                </Field>
                <Field label="Квота" required>
                  <Input
                    type="number"
                    value={form.quota}
                    onChange={(v) => set("quota", v)}
                    min={1}
                    placeholder="20"
                  />
                </Field>
              </Grid>
              <Grid cols={2}>
                <Field label="Дата завершення">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(v) => set("endDate", v)}
                  />
                </Field>
                <Field label="Час завершення">
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(v) => set("endTime", v)}
                  />
                </Field>
              </Grid>
            </Section>
            ) : null}

            {wizardStep === 3 ? (
            <Section title="Вартість">
              <Field label="Тариф" required>
                <Select
                  value={form.costTier}
                  onChange={(v) => set("costTier", v as CostTier)}
                  options={COST_OPTS}
                />
              </Field>
              {(form.costTier === "paid" ||
                form.costTier === "discount_for_veterans") ? (
                <Grid cols={2}>
                  <Field label="Ціна, грн" required>
                    <Input
                      type="number"
                      value={form.priceUah}
                      onChange={(v) => set("priceUah", v)}
                      min={0}
                    />
                  </Field>
                  {form.costTier === "discount_for_veterans" ? (
                    <Field label="Ціна для ветеранів, грн" required>
                      <Input
                        type="number"
                        value={form.veteranPriceUah}
                        onChange={(v) => set("veteranPriceUah", v)}
                        min={0}
                      />
                    </Field>
                  ) : null}
                </Grid>
              ) : null}
            </Section>
            ) : null}

            {wizardStep === 4 ? (
            <Section title="Локація">
              <Grid cols={2}>
                <Field label="Місто">
                  <Input
                    value={form.city}
                    onChange={(v) => set("city", v)}
                    placeholder="Київ"
                  />
                </Field>
                <Field label="Район (Київ)">
                  <Select
                    value={form.district}
                    onChange={(v) => set("district", v as KyivDistrict | "")}
                    options={[
                      { id: "", label: "—" },
                      ...DISTRICT_OPTS,
                    ]}
                  />
                </Field>
              </Grid>
              <Field label="Заклад">
                <Input
                  value={form.venue}
                  onChange={(v) => set("venue", v)}
                  placeholder="Простір “Свої”"
                />
              </Field>
              <Field
                label="Вулиця й точка на карті"
                hint="Підказки з OpenStreetMap (Україна). Натисни на карту або перетягни маркер, щоб виставити координати — адреса оновиться автоматично."
              >
                <LocationPicker
                  inputId="admin-event-location"
                  placeholder="вул. Хрещатик, 1 або назва місця"
                  place={form.address}
                  lat={parseCoordStr(form.lat)}
                  lng={parseCoordStr(form.lng)}
                  onChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      address: v.place,
                      lat: v.lat != null ? String(v.lat) : "",
                      lng: v.lng != null ? String(v.lng) : "",
                    }))
                  }
                />
              </Field>
            </Section>
            ) : null}

            {wizardStep === 5 ? (
            <Section title="Доступність і обкладинка">
              <Field label="Теги доступності">
                <ChipGroup
                  options={ACCESSIBILITY_OPTS}
                  value={form.accessibility}
                  onToggle={(id) => {
                    const next = new Set(form.accessibility);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    set("accessibility", next);
                  }}
                />
              </Field>
              <Field label="Обкладинка (URL)" hint="Можна залишити порожнім">
                <Input
                  value={form.coverImageUrl}
                  onChange={(v) => set("coverImageUrl", v)}
                  placeholder="https://…"
                />
              </Field>
              <Toggle
                label="Лише для верифікованих УБД"
                checked={form.verifiedOnly}
                onChange={(v) => set("verifiedOnly", v)}
              />
            </Section>
            ) : null}

            {!isEdit && wizardStep === 6 ? (
              <Section title="Статус публікації">
                <Field label="Що зробити після створення?">
                  <Select
                    value={form.status}
                    onChange={(v) => set("status", v as EventStatus)}
                    options={ADMIN_STATUS_OPTS}
                  />
                </Field>
              </Section>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-[12px] px-3.5 py-2.5"
                style={{
                  background: "#FBE8E8",
                  color: "#9B3D3D",
                  fontSize: 13,
                  whiteSpace: "pre-wrap",
                }}
              >
                {error}
              </div>
            ) : null}
    </form>
  );

  const editorFooter = (
    <footer className="border-border-soft flex flex-shrink-0 items-center justify-between gap-3 border-t bg-white px-5 py-4 sm:px-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Btn kind="ghost" onClick={onClose} disabled={submitting}>
          Скасувати
        </Btn>
        {wizardStep > 1 ? (
          <Btn
            kind="secondary"
            size="md"
            onClick={goPrevStep}
            disabled={submitting}
            icon={<BackIcon size={15} />}
          >
            Назад
          </Btn>
        ) : null}
      </div>
      {isLastWizardStep ? (
        <Btn
          kind="primary"
          type="button"
          onClick={() => void onSubmit()}
          loading={submitting}
          disabled={validation.errors.length > 0 && !submitting}
        >
          {isEdit ? "Зберегти" : "Створити"}
        </Btn>
      ) : (
        <Btn
          kind="primary"
          type="button"
          onClick={goNextStep}
          iconRight={<ArrowIcon size={15} />}
        >
          Далі
        </Btn>
      )}
    </footer>
  );

  const shell = (
    <div
      className={
        isDialog
          ? "bg-bg relative my-0 flex w-full max-w-[820px] flex-col overflow-hidden shadow-2xl sm:my-8 sm:rounded-2xl"
          : "border-border-soft relative mx-auto my-0 flex w-full max-w-[1280px] flex-1 flex-col overflow-hidden border bg-white sm:my-6 sm:min-h-0 sm:rounded-2xl sm:shadow-md"
      }
      style={isDialog ? { maxHeight: "100dvh" } : { minHeight: "min(100dvh, 100%)" }}
    >
      <header className="border-border-soft flex items-center justify-between border-b bg-white px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2
            id="admin-event-editor-title"
            className="text-text m-0"
            style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
          {isEdit ? (
            <div
              className="text-text2 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ fontSize: 12 }}
            >
              {mode.event.title}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={isDialog ? "Закрити" : "Назад до списку"}
          onClick={onClose}
          className="text-text2 inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-black/5"
        >
          <CloseIcon size={18} />
        </button>
      </header>

      <div className="border-border-soft border-b bg-white px-5 py-3.5 sm:px-6">
        <div className="hidden sm:block">
          <AdminEventStepper
            steps={wizardSteps}
            step={wizardStep}
            onJump={(id) => {
              setError(null);
              setWizardStep(id);
            }}
          />
        </div>
        <div className="sm:hidden">
          <AdminEventStepper
            compact
            steps={wizardSteps}
            step={wizardStep}
          />
        </div>
      </div>

      {isDialog ? (
        <>
          <div className="flex-1 overflow-auto px-5 py-5 sm:px-6">{formEl}</div>
          {editorFooter}
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="border-border-soft flex min-h-0 min-w-0 flex-1 flex-col lg:border-r">
            <div className="flex-1 overflow-auto px-5 py-5 sm:px-6">{formEl}</div>
            {editorFooter}
          </div>
          <aside
            className="border-border-soft bg-bg flex w-full flex-shrink-0 flex-col border-t lg:w-[min(400px,38%)] lg:max-w-[460px] lg:border-t-0 lg:border-l"
            aria-label="Превʼю події"
          >
            <div className="border-border-soft flex flex-shrink-0 items-center justify-between border-b bg-white px-5 py-3.5 sm:px-6">
              <span
                className="text-text-muted"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Превʼю · картка у списку
              </span>
              <Pill color="grey">live</Pill>
            </div>
            <div className="min-h-[260px] flex-1 overflow-auto lg:min-h-0">
              {previewDraft ? <EventPagePreview draft={previewDraft} /> : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );

  if (isDialog) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-event-editor-title"
        className="fixed inset-0 z-50 flex justify-center"
      >
        <button
          type="button"
          aria-label="Закрити"
          onClick={onClose}
          className="absolute inset-0 bg-black/35"
        />
        {shell}
      </div>
    );
  }

  return (
    <main
      className="bg-bg flex min-h-[100dvh] flex-col"
      aria-labelledby="admin-event-editor-title"
    >
      {shell}
    </main>
  );
}

// ─── Validation ─────────────────────────────────────────────────────────

interface ValidationResult {
  errors: string[];
}

function validateWizardStep(
  step: number,
  form: FormState,
  isEdit: boolean,
): string | null {
  if (step === 6 && isEdit) return null;
  switch (step) {
    case 1:
      if (!form.title.trim() || form.title.trim().length < 3) {
        return "Назва має містити щонайменше 3 символи.";
      }
      if (form.description.trim().length > 150) {
        return "Опис не може перевищувати 150 символів.";
      }
      return null;
    case 2:
      if (!form.date || !form.time) {
        return "Вкажи дату і час старту.";
      }
      {
        const starts = combineDateTime(form.date, form.time);
        if (!isEdit && starts.getTime() <= Date.now()) {
          return "Старт має бути у майбутньому.";
        }
        if (form.endDate || form.endTime) {
          if (!form.endDate || !form.endTime) {
            return "Заверши заповнення дати/часу завершення.";
          }
          const ends = combineDateTime(form.endDate, form.endTime);
          if (ends.getTime() <= starts.getTime()) {
            return "Завершення має бути після старту.";
          }
        }
      }
      {
        const quota = parseInt(form.quota, 10);
        if (!quota || quota < 1) {
          return "Квота має бути щонайменше 1.";
        }
      }
      return null;
    case 3:
      if (form.costTier === "paid") {
        if (!form.priceUah || Number(form.priceUah) < 0) {
          return "Вкажи ціну.";
        }
      }
      if (form.costTier === "discount_for_veterans") {
        if (!form.priceUah || !form.veteranPriceUah) {
          return "Вкажи звичайну ціну і ціну для ветеранів.";
        }
      }
      return null;
    case 4:
    case 5:
    case 6:
      return null;
    default:
      return null;
  }
}

function validate(form: FormState, isEdit: boolean): ValidationResult {
  const errors: string[] = [];
  const max = maxWizardStep(isEdit);
  for (let s = 1; s <= max; s++) {
    const msg = validateWizardStep(s, form, isEdit);
    if (msg) errors.push(msg);
  }
  return { errors };
}

// ─── Payload builders ──────────────────────────────────────────────────

function buildCreatePayload(form: FormState): EventCreatePayload {
  const starts = combineDateTime(form.date, form.time);
  const ends =
    form.endDate && form.endTime
      ? combineDateTime(form.endDate, form.endTime)
      : null;
  return {
    category: form.category,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    quota: parseInt(form.quota, 10),
    starts_at: starts.toISOString(),
    ends_at: ends ? ends.toISOString() : undefined,
    format: form.format,
    repeat: form.repeat,
    for_whom: form.forWhom,
    cost: buildCost(form),
    accessibility_tags: Array.from(form.accessibility),
    verified_only: form.verifiedOnly,
    location: buildLocation(form) ?? undefined,
    cover_image_url: form.coverImageUrl.trim() || undefined,
    status: form.status,
  };
}

function buildUpdatePayload(
  form: FormState,
  original: ApiEvent,
): EventUpdatePayload {
  const payload: EventUpdatePayload = {};
  if (form.title.trim() !== original.title) {
    payload.title = form.title.trim();
  }
  const desc = form.description.trim();
  if ((original.description ?? "") !== desc) {
    payload.description = desc;
  }
  if (form.category !== original.category) payload.category = form.category;
  if (form.format !== original.format) payload.format = form.format;
  if (form.repeat !== (original.repeat ?? "once")) payload.repeat = form.repeat;
  if (form.forWhom !== original.for_whom) payload.for_whom = form.forWhom;
  const quota = parseInt(form.quota, 10);
  if (quota !== original.quota) payload.quota = quota;

  const starts = combineDateTime(form.date, form.time);
  if (starts.toISOString() !== new Date(original.starts_at).toISOString()) {
    payload.starts_at = starts.toISOString();
  }
  const endsIso =
    form.endDate && form.endTime
      ? combineDateTime(form.endDate, form.endTime).toISOString()
      : null;
  const origEndsIso = original.ends_at
    ? new Date(original.ends_at).toISOString()
    : null;
  if (endsIso !== origEndsIso) {
    payload.ends_at = endsIso;
  }

  const cost = buildCost(form);
  const origCost = original.cost ?? { tier: "free_for_all" as CostTier };
  if (
    cost.tier !== origCost.tier ||
    (cost.price_uah ?? null) !== (origCost.price_uah ?? null) ||
    (cost.veteran_price_uah ?? null) !== (origCost.veteran_price_uah ?? null)
  ) {
    payload.cost = cost;
  }

  const tags = Array.from(form.accessibility).sort();
  const origTags = (original.accessibility_tags ?? []).slice().sort();
  if (tags.join(",") !== origTags.join(",")) {
    payload.accessibility_tags = tags;
  }

  if (form.verifiedOnly !== original.verified_only) {
    payload.verified_only = form.verifiedOnly;
  }

  const loc = buildLocation(form);
  const origLoc = original.location ?? null;
  if (!sameLocation(loc, origLoc)) {
    if (loc) payload.location = loc;
  }

  const cover = form.coverImageUrl.trim();
  const origCover = original.cover_image_url ?? "";
  if (cover !== origCover) {
    payload.cover_image_url = cover ? cover : null;
  }

  return payload;
}

function parseCoordStr(s: string): number | null {
  const n = Number.parseFloat(s.trim());
  return Number.isFinite(n) ? n : null;
}

function buildCost(form: FormState) {
  const cost: { tier: CostTier; price_uah?: number; veteran_price_uah?: number } = {
    tier: form.costTier,
  };
  if (form.costTier === "paid" || form.costTier === "discount_for_veterans") {
    if (form.priceUah) cost.price_uah = Number(form.priceUah);
  }
  if (form.costTier === "discount_for_veterans" && form.veteranPriceUah) {
    cost.veteran_price_uah = Number(form.veteranPriceUah);
  }
  return cost;
}

function buildLocation(form: FormState): ApiLocation | null {
  const out: ApiLocation = {};
  if (form.city.trim()) out.city = form.city.trim();
  if (form.district) out.district = form.district as KyivDistrict;
  if (form.address.trim()) out.address = form.address.trim();
  if (form.venue.trim()) out.venue = form.venue.trim();
  if (form.lat) out.lat = Number(form.lat);
  if (form.lng) out.lng = Number(form.lng);
  return Object.keys(out).length ? out : null;
}

function sameLocation(
  a: ApiLocation | null,
  b: ApiLocation | null,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    (a.city ?? "") === (b.city ?? "") &&
    (a.district ?? "") === (b.district ?? "") &&
    (a.address ?? "") === (b.address ?? "") &&
    (a.venue ?? "") === (b.venue ?? "") &&
    (a.lat ?? null) === (b.lat ?? null) &&
    (a.lng ?? null) === (b.lng ?? null)
  );
}

// ─── Date helpers ──────────────────────────────────────────────────────

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toTimeInput(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

// ─── Form primitives (admin-only — kept local for cohesion) ────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-border-soft m-0 flex flex-col gap-3 rounded-[14px] border bg-white px-4 py-4">
      <legend
        className="text-text-muted px-1"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Grid({
  cols,
  children,
}: {
  cols: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label
        className="text-text-muted mb-1.5 block"
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required ? (
          <span style={{ color: "#C04848", marginLeft: 4 }} aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p
          className="text-text2 m-0 mt-1.5"
          style={{ fontSize: 12, lineHeight: 1.45 }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  "border-border focus:border-primary text-text w-full rounded-[10px] border bg-white px-3 py-2 outline-none transition-colors placeholder:text-[var(--color-text-muted)]";

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  min,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date" | "time" | "url" | "email";
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  min?: number;
  maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      min={min}
      maxLength={maxLength}
      className={INPUT_BASE}
      style={{ fontSize: 14 }}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 3,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      maxLength={maxLength}
      className={`${INPUT_BASE} resize-y`}
      style={{ fontSize: 14, lineHeight: 1.5 }}
    />
  );
}

function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { id: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={INPUT_BASE}
      style={{ fontSize: 14 }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onToggle,
}: {
  options: readonly { id: T; label: string }[];
  value: Set<T>;
  onToggle: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            aria-pressed={on}
            className="inline-flex items-center rounded-full px-3 py-1.5 transition-colors"
            style={{
              background: on ? "#1A1A1A" : "#fff",
              color: on ? "#fff" : "var(--color-text)",
              border: on ? "none" : "1px solid var(--color-border)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "-0.005em",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="border-border-soft flex items-center justify-between rounded-[12px] border bg-white px-3.5 py-3 text-left"
    >
      <span
        className="text-text"
        style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.005em" }}
      >
        {label}
      </span>
      <span
        aria-hidden
        className="relative h-7 flex-shrink-0 rounded-[14px]"
        style={{
          width: 46,
          background: checked ? "var(--color-success)" : "#E5E3DD",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white"
          style={{
            left: checked ? "auto" : 2,
            right: checked ? 2 : "auto",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.18s ease, right 0.18s ease",
          }}
        />
      </span>
    </button>
  );
}
