import { api } from "./client";
import type {
  ApiEventCategory,
  DocumentType,
  KyivDistrict,
} from "./types";

export interface DocumentTypeRef {
  code: DocumentType;
  label: string;
  priority: number;
}

export interface EventCategoryRef {
  code: ApiEventCategory;
  label: string;
  icon?: string;
  display_order?: number;
}

export interface DistrictRef {
  code: KyivDistrict;
  label: string;
}

export interface LimitsRef {
  event_title_max: number;
  event_description_max: number;
  feedback_text_max: number;
  doc_photo_max_mb: number;
  group_max_seats: number;
  group_confirm_window_hours: number;
}

export const referenceApi = {
  documentTypes: () =>
    api.get<{ items: DocumentTypeRef[] }>("/api/v1/reference/document-types"),

  eventCategories: () =>
    api.get<{ items: EventCategoryRef[] }>("/api/v1/reference/event-categories"),

  cities: () => api.get<{ items: string[] }>("/api/v1/reference/cities"),

  districts: (city?: string) =>
    api.get<{ items: DistrictRef[] }>("/api/v1/reference/districts", { city }),

  limits: () => api.get<LimitsRef>("/api/v1/reference/limits"),
};
