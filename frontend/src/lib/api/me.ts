import { api } from "./client";
import type {
  AudienceStatus,
  ApiEventCategory,
  RegistrationPage,
  RegistrationStatus,
  Veteran,
} from "./types";

export interface VeteranUpdatePayload {
  fullname?: string;
  brigade?: string;
  rank?: string;
  audience_status?: AudienceStatus;
  city?: string;
  interests?: ApiEventCategory[];
}

export const meApi = {
  get: () => api.get<Veteran>("/api/v1/me"),

  update: (payload: VeteranUpdatePayload) =>
    api.patch<Veteran>("/api/v1/me", payload),

  registrations: (params?: {
    status?: RegistrationStatus;
    limit?: number;
    cursor?: string;
  }) => api.get<RegistrationPage>("/api/v1/me/registrations", params),
};
