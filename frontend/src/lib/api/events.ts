import { api, type Query } from "./client";
import type {
  ApiEventDetail,
  EventCreatePayload,
  EventListFilters,
  EventPage,
  Registration,
  RegistrationCreate,
  RegistrationPage,
} from "./types";

function filtersToQuery(filters?: EventListFilters): Query | undefined {
  if (!filters) return undefined;
  // EventListFilters has a closed shape, but `Query` expects an open
  // index signature. Cast through unknown — the values themselves are
  // already valid query primitives by construction.
  return filters as unknown as Query;
}

export const eventsApi = {
  list: (filters?: EventListFilters, signal?: AbortSignal) =>
    api.get<EventPage>("/api/v1/events", filtersToQuery(filters), signal),

  get: (id: string, signal?: AbortSignal) =>
    api.get<ApiEventDetail>(`/api/v1/events/${id}`, undefined, signal),

  create: (payload: EventCreatePayload) =>
    api.post<ApiEventDetail>("/api/v1/events", payload),

  /**
   * Upload an event cover photo. Veteran-only — backend stores the file
   * via the configured uploader (local in dev, GCS in prod) and returns
   * a public URL. Field name must be `file`; allowed types: jpg/png/webp;
   * max size 10MB (mirrors `backend/internal/http_handler/upload_handler.go`).
   */
  uploadCover: (file: File, signal?: AbortSignal) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.postForm<{ url: string }>(
      "/api/v1/me/uploads/event-cover",
      fd,
      { signal },
    );
  },

  // Registrations
  register: (eventId: string, payload: RegistrationCreate) =>
    api.post<Registration>(`/api/v1/events/${eventId}/registrations`, payload),

  cancelRegistration: (eventId: string, registrationId: string) =>
    api.delete<void>(
      `/api/v1/events/${eventId}/registrations/${registrationId}`,
    ),

  roster: (eventId: string) =>
    api.get<RegistrationPage>(`/api/v1/events/${eventId}/registrations`),
};
