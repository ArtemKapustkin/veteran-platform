// Admin moderation endpoints — covers `GET /api/v1/admin/veterans`,
// `GET /api/v1/admin/veterans/{id}`, `POST /api/v1/admin/veterans/{id}/verify`,
// and `POST /api/v1/admin/veterans/{id}/block`. All require a bearer token
// whose role is `admin`; otherwise the backend returns 403 and we surface
// it via ApiError.
//
// Mirrors the routes registered in
// `backend/internal/http_handler/admin_veteran_handler.go`.

import { api, type Query } from "./client";
import type { AdminVeteranListFilters, Veteran, VeteranPage } from "./types";
import type { VerificationState } from "./verification";

export interface AdminVeteranDetail {
  veteran: Veteran;
  verification: VerificationState;
}

function filtersToQuery(f?: AdminVeteranListFilters): Query | undefined {
  if (!f) return undefined;
  // The filter type has a closed shape, but `Query` expects an open
  // index signature. Cast through unknown — the values themselves are
  // already valid query primitives by construction.
  return f as unknown as Query;
}

export const adminVeteransApi = {
  list: (filters?: AdminVeteranListFilters, signal?: AbortSignal) =>
    api.get<VeteranPage>(
      "/api/v1/admin/veterans",
      filtersToQuery(filters),
      signal,
    ),

  get: (id: string, signal?: AbortSignal) =>
    api.get<AdminVeteranDetail>(
      `/api/v1/admin/veterans/${id}`,
      undefined,
      signal,
    ),

  /**
   * Manually approve or reject a veteran's verification, overriding any
   * prior AI verdict. The note is stored on the resulting attempt row so
   * the audit trail keeps the admin's reasoning together with the decision.
   */
  verify: (id: string, approved: boolean, note?: string) =>
    api.post<VerificationState>(`/api/v1/admin/veterans/${id}/verify`, {
      approved,
      note: note ?? "",
    }),

  /**
   * Block the veteran's account and revoke all active refresh tokens. Used
   * when a submission turns out to be fraudulent rather than just unreadable.
   */
  block: (id: string) =>
    api.post<Veteran>(`/api/v1/admin/veterans/${id}/block`),
};
