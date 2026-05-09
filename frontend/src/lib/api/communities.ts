import { api } from "./client";
import type { Community, CommunityPage } from "./types";

export interface CommunityCreatePayload {
  name: string;
  tg_channel_link?: string;
}

export interface CommunityUpdatePayload {
  name?: string;
  tg_channel_link?: string | null;
}

export const communitiesApi = {
  list: (params?: { search?: string; limit?: number; cursor?: string }) =>
    api.get<CommunityPage>("/api/v1/communities", params),

  get: (id: string) => api.get<Community>(`/api/v1/communities/${id}`),

  create: (payload: CommunityCreatePayload) =>
    api.post<Community>("/api/v1/communities", payload),

  update: (id: string, payload: CommunityUpdatePayload) =>
    api.patch<Community>(`/api/v1/communities/${id}`, payload),

  remove: (id: string) => api.delete<void>(`/api/v1/communities/${id}`),
};
