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
