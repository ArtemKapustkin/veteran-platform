import { api } from "./client";
import type { InvitationLookup, Registration } from "./types";

// Public Telegram-share invitation endpoints. Mirror
// `backend/internal/http_handler/invitation_handler.go`. The token in
// the path is the only credential the backend cares about — auth is
// only required for the claim/decline writes so we know which veteran
// owns the slot.

export const invitationsApi = {
  /**
   * Public preview of the invitation. Safe to call without auth so the
   * landing page can render before sign-in. When a bearer token is
   * present the response also tells us if the caller already claimed
   * this slot, letting the UI route them straight to the event page.
   */
  lookup: (token: string, signal?: AbortSignal) =>
    api.get<InvitationLookup>(
      `/api/v1/invitations/${encodeURIComponent(token)}`,
      undefined,
      signal,
    ),

  /** Claim the seat for the calling veteran. Requires auth. */
  claim: (token: string) =>
    api.post<Registration>(
      `/api/v1/invitations/${encodeURIComponent(token)}/claim`,
    ),

  /** Decline — releases all seats in the group. Requires auth. */
  decline: (token: string) =>
    api.post<Registration>(
      `/api/v1/invitations/${encodeURIComponent(token)}/decline`,
    ),
};
