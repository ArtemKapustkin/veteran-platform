import { api, type Query } from "./client";
import type {
  AdminEventListFilters,
  ApiEventDetail,
  EventCreatePayload,
  EventListFilters,
  EventPage,
  EventUpdatePayload,
  Registration,
  RegistrationCreate,
  RegistrationPage,
} from "./types";

function filtersToQuery(
  filters?: EventListFilters | AdminEventListFilters,
): Query | undefined {
  if (!filters) return undefined;
  // The filter types have closed shapes, but `Query` expects an open
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
   * Upload an event cover image. Auth: veteran or admin (`RequireVeteran`
   * allows both). Returns a public URL for `cover_image_url`.
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

  // ── Admin ────────────────────────────────────────────────────────────
  // Mirrors the routes registered in
  // `backend/internal/http_handler/admin_event_handler.go`. All require
  // a bearer token whose role is `admin`; otherwise the backend returns
  // 403 and we surface it via ApiError.

  adminList: (filters?: AdminEventListFilters, signal?: AbortSignal) =>
    api.get<EventPage>(
      "/api/v1/admin/events",
      filtersToQuery(filters),
      signal,
    ),

  adminCreate: (payload: EventCreatePayload) =>
    api.post<ApiEventDetail>("/api/v1/admin/events", payload),

  adminUpdate: (id: string, payload: EventUpdatePayload) =>
    api.patch<ApiEventDetail>(`/api/v1/admin/events/${id}`, payload),

  adminRemove: (id: string) =>
    api.delete<void>(`/api/v1/admin/events/${id}`),

  adminApprove: (id: string) =>
    api.post<ApiEventDetail>(`/api/v1/admin/events/${id}/approve`),

  adminReject: (id: string, reason?: string) =>
    api.post<ApiEventDetail>(`/api/v1/admin/events/${id}/reject`, {
      reason: reason ?? "",
    }),

  adminPublish: (id: string) =>
    api.post<ApiEventDetail>(`/api/v1/admin/events/${id}/publish`),

  adminCancel: (id: string) =>
    api.post<ApiEventDetail>(`/api/v1/admin/events/${id}/cancel`),
};
