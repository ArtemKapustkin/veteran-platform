// Communities — external Telegram-hub directory. Public list/get,
// veteran-owned create/patch/delete, plus admin list (with deleted) and
// force-delete. Mirrors `Communities` and `Admin / Communities` paths in
// `backend/openapi.yaml`.

import { api, type Query } from "./client";
import type { Community, CommunityPage } from "./types";

export interface CommunityListParams {
  search?: string;
  limit?: number;
  cursor?: string;
}

export interface AdminCommunityListParams {
  q?: string;
  include_deleted?: boolean;
  limit?: number;
  cursor?: string;
}

export interface CommunityCreatePayload {
  name: string;
  tg_channel_link?: string;
}

// `tg_channel_link: null` is accepted by the OpenAPI schema (nullable) so
// callers can wipe the link, though the current Go handler ignores nulls
// — the field stays for forward compatibility.
export interface CommunityUpdatePayload {
  name?: string;
  tg_channel_link?: string | null;
}

export const communitiesApi = {
  list: (params?: CommunityListParams, signal?: AbortSignal) =>
    api.get<CommunityPage>(
      "/api/v1/communities",
      params as Query | undefined,
      signal,
    ),

  get: (id: string, signal?: AbortSignal) =>
    api.get<Community>(`/api/v1/communities/${id}`, undefined, signal),

  create: (payload: CommunityCreatePayload) =>
    api.post<Community>("/api/v1/communities", payload),

  update: (id: string, payload: CommunityUpdatePayload) =>
    api.patch<Community>(`/api/v1/communities/${id}`, payload),

  remove: (id: string) => api.delete<void>(`/api/v1/communities/${id}`),

  // ── Admin ────────────────────────────────────────────────────────────
  // Admin list returns soft-deleted rows when `include_deleted=true`. The
  // search field is `q` (not `search`) — that's the backend's convention
  // for admin endpoints.
  adminList: (params?: AdminCommunityListParams, signal?: AbortSignal) =>
    api.get<CommunityPage>(
      "/api/v1/admin/communities",
      params as Query | undefined,
      signal,
    ),

  // Force-delete bypasses the owner check. Used from the moderation UI.
  adminRemove: (id: string) =>
    api.delete<void>(`/api/v1/admin/communities/${id}`),
};
