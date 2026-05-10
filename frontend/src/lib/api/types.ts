// Hand-rolled mirror of `backend/openapi.yaml`. Keep in sync when the
// schema changes. We only redefine what the SPA actually uses today;
// missing admin-only fields can be added incrementally.

export type AudienceStatus =
  | "veteran"
  | "veteran_female"
  | "family"
  | "fallen_family"
  | "active_military"
  | "other";

export type DocumentType =
  | "ubd_dia"
  | "ubd_paper"
  | "reestr_extract"
  | "form_6"
  | "military_book"
  | "family_fallen"
  | "self_declaration";

export type ApiEventCategory =
  | "spa"
  | "sport"
  | "yoga"
  | "culture"
  | "education"
  | "nature"
  | "psychology"
  | "social"
  | "rehabilitation";

export type EventFormat = "offline" | "online" | "hybrid";

export type EventRepeat = "once" | "weekly" | "biweekly" | "monthly";

export type ForWhom =
  | "veterans"
  | "female_veterans"
  | "male_veterans"
  | "families"
  | "children"
  | "fallen_families"
  | "active_military"
  | "veterans_and_families"
  | "open";

export type CostTier =
  | "free_for_all"
  | "free_for_veterans_and_families"
  | "free_for_ubd"
  | "free_via_state_program"
  | "discount_for_veterans"
  | "paid";

export interface EventCost {
  tier: CostTier;
  price_uah?: number | null;
  veteran_price_uah?: number | null;
}

export type AccessibilityTag =
  | "is_accessible"
  | "no_shooting"
  | "kids_allowed"
  | "separate_zones"
  | "shelter_nearby"
  | "age_18_plus";

export type KyivDistrict =
  | "holosiivskyi"
  | "obolonskyi"
  | "pecherskyi"
  | "podilskyi"
  | "sviatoshynskyi"
  | "solomianskyi"
  | "shevchenkivskyi"
  | "darnytskyi"
  | "desnianskyi"
  | "dniprovskyi";

export type ParticipantsBucket = "up_to_10" | "10_to_30" | "30_plus";

export type EventStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "cancelled"
  | "deleted";

export type RegistrationStatus =
  | "pending_companions"
  | "confirmed"
  | "cancelled"
  | "expired";

// `pending_review` is the bucket the admin queue cares about: AI couldn't
// auto-approve (no_match / unreadable / upstream error) so a human needs
// to look. `rejected` is reserved for explicit admin rejections.
export type VerificationStatus =
  | "none"
  | "processing"
  | "pending_review"
  | "approved"
  | "rejected";

export interface Pagination {
  next_cursor: string | null;
  total?: number | null;
}

export interface Location {
  city?: string;
  district?: KyivDistrict;
  address?: string;
  venue?: string | null;
  lat?: number;
  lng?: number;
}

// Privacy-respecting summary of a confirmed/pending attendee. Only what
// we'd show in a public avatar circle: up to two uppercase initials (first
// name + surname, e.g. "ІП"), an optional first name, and the audience
// bucket (so the UI can colour-tone female-vet vs family vs active-military
// differently if it wants to).
export interface ApiEventAttendee {
  veteran_id: string;
  /** Up to two uppercase initials, e.g. "ІП" for "Іван Петренко". */
  initial: string;
  first_name?: string;
  audience_status?: AudienceStatus;
}

export interface ApiEvent {
  id: string;
  category: ApiEventCategory;
  status: EventStatus;
  title: string;
  description?: string;
  quota: number;
  seats_taken: number;
  seats_remaining?: number;
  starts_at: string;
  ends_at?: string | null;
  format: EventFormat;
  repeat?: EventRepeat;
  for_whom: ForWhom;
  cost: EventCost;
  accessibility_tags?: AccessibilityTag[];
  verified_only: boolean;
  community_id?: string | null;
  location?: Location;
  cover_image_url?: string | null;
  created_by_role: "admin" | "veteran";
  created_by_id: string;
  rejection_reason?: string | null;
  created_at: string;
  /** Up to 8 attendee summaries; total count is `seats_taken`. */
  attendees?: ApiEventAttendee[];
}

export interface RegistrationCompanion {
  id: string;
  phone: string;
  veteran_id?: string | null;
  fullname?: string | null;
  status: "pending" | "confirmed" | "declined";
  responded_at?: string | null;
}

export interface Registration {
  id: string;
  event_id: string;
  veteran_id: string;
  seats: number;
  status: RegistrationStatus;
  companions?: RegistrationCompanion[];
  reservation_expires_at?: string | null;
  created_at: string;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
}

export interface ApiEventDetail extends ApiEvent {
  my_registration?: Registration | null;
}

export interface EventPage {
  items: ApiEvent[];
  pagination: Pagination;
}

export interface RegistrationPage {
  items: Registration[];
  pagination: Pagination;
}

export interface Veteran {
  id: string;
  phone: string;
  fullname?: string | null;
  brigade?: string | null;
  rank?: string | null;
  audience_status?: AudienceStatus;
  verified: boolean;
  verification_status: VerificationStatus;
  role: "veteran" | "admin";
  account_status: "active" | "blocked";
  city?: string | null;
  interests?: ApiEventCategory[];
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  role: "veteran" | "admin";
}

export interface AuthTokensVeteran extends AuthTokens {
  veteran?: Veteran;
}

export interface Community {
  id: string;
  name: string;
  tg_channel_link?: string | null;
  owner_id: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface CommunityPage {
  items: Community[];
  pagination: Pagination;
}

export interface Invitation {
  id: string;
  registration_id: string;
  event: ApiEvent;
  invited_by_fullname?: string | null;
  invited_by_phone: string;
  seats_in_group: number;
  reservation_expires_at: string;
  status: "pending" | "confirmed" | "declined";
}

export interface RegistrationCreate {
  seats: number;
  companion_phones?: string[];
}

// Filters used by the public events list. Mirrors `GET /api/v1/events`
// query params; arrays become repeated `?key=v1&key=v2`.
export interface EventListFilters {
  category?: ApiEventCategory[];
  for_whom?: ForWhom[];
  format?: EventFormat[];
  repeat?: EventRepeat;
  cost?: CostTier[];
  city?: string;
  district?: KyivDistrict[];
  accessibility_tags?: AccessibilityTag[];
  participants_bucket?: ParticipantsBucket;
  date_from?: string;
  date_to?: string;
  verified_only?: boolean;
  community_id?: string;
  has_quota?: boolean;
  q?: string;
  sort?: "date_asc" | "date_desc" | "quota_remaining";
  limit?: number;
  cursor?: string;
}

export interface EventCreatePayload {
  category: ApiEventCategory;
  title: string;
  description?: string;
  quota: number;
  starts_at: string;
  ends_at?: string;
  format: EventFormat;
  repeat?: EventRepeat;
  for_whom: ForWhom;
  cost: EventCost;
  accessibility_tags?: AccessibilityTag[];
  verified_only?: boolean;
  community_id?: string | null;
  location?: Location;
  cover_image_url?: string;
  /** Admin-only: lets the create call publish or draft directly. Ignored
   *  for veteran callers (backend forces `pending_approval`). */
  status?: EventStatus;
}

// Admin PATCH payload — every field optional. Mirrors the Go
// `updateEventReq` struct in `admin_event_handler.go`. Sending
// `accessibility_tags: []` clears the tags; omitting the key leaves them
// untouched (the backend uses presence detection on the JSON key).
export interface EventUpdatePayload {
  category?: ApiEventCategory;
  title?: string;
  description?: string;
  quota?: number;
  starts_at?: string;
  ends_at?: string | null;
  format?: EventFormat;
  repeat?: EventRepeat;
  for_whom?: ForWhom;
  cost?: EventCost;
  accessibility_tags?: AccessibilityTag[];
  verified_only?: boolean;
  community_id?: string | null;
  location?: Location;
  cover_image_url?: string | null;
}

// Admin filters — superset of the public filters, plus visibility into
// non-published statuses and the creator role. `q` and `community_id`
// are shared with the public list. Date/cost-tier/etc. filters are
// intentionally omitted: the admin queue already paginates everything,
// so the moderator can scroll instead of constructing complex queries.
export interface AdminEventListFilters {
  category?: ApiEventCategory[];
  status?: EventStatus[];
  created_by?: "admin" | "veteran";
  community_id?: string;
  q?: string;
  sort?: "date_asc" | "date_desc" | "quota_remaining";
  limit?: number;
  cursor?: string;
}

// Admin filters for `GET /api/v1/admin/veterans`. Mirrors the Go
// `VeteranListFilters` struct in `repository/veteran_repository.go`. The
// admin verifications screen uses this to filter the queue.
export interface AdminVeteranListFilters {
  verification_status?: VerificationStatus;
  verified?: boolean;
  audience_status?: AudienceStatus;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface VeteranPage {
  items: Veteran[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
