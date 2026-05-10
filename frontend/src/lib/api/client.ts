// Tiny fetch wrapper used by every endpoint module under `lib/api/`.
//
// Responsibilities:
//   - Resolve the base URL from `NEXT_PUBLIC_API_BASE_URL` so dev/prod
//     environments don't need a build-time switch.
//   - Inject the access token from `useAuthStore` for non-public calls.
//   - Convert non-2xx responses into `ApiError`, the single error type
//     callers need to catch (preserving the structured `code/message/
//     details` body returned by the backend).
//   - Serialise array query params as `?k=a&k=b` (what the Go fasthttp
//     router expects, mirroring the OpenAPI `style: form, explode: true`).

import type { ApiErrorBody } from "./types";

// Per-environment defaults so a production build that wasn't given an explicit
// `NEXT_PUBLIC_API_BASE_URL` still hits the deployed Cloud Run backend instead
// of accidentally pointing at localhost. Dev keeps the local fasthttp port.
const DEV_DEFAULT_BASE_URL = "http://localhost:8088";
const PROD_DEFAULT_BASE_URL =
  "https://veteran-platform-backend-136148031564.europe-west3.run.app";

export function apiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (explicit) return explicit;
  return process.env.NODE_ENV === "production"
    ? PROD_DEFAULT_BASE_URL
    : DEV_DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody | string) {
    const message =
      typeof body === "string" ? body : body.message || "API error";
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = typeof body === "string" ? "unknown" : body.code;
    this.details = typeof body === "string" ? undefined : body.details;
  }
}

// Token resolution is intentionally module-level so the api modules don't
// each have to import the auth store. The store wires this up at boot.
type TokenProvider = () => string | null;
let tokenProvider: TokenProvider = () => null;

export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

export type Query = Record<
  string,
  | string
  | number
  | boolean
  | null
  | undefined
  | string[]
  | number[]
>;

function buildQuery(query?: Query): string {
  if (!query) return "";
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, String(v));
    } else {
      sp.append(key, String(value));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Query;
  body?: unknown;
  // Multipart upload (verification flow) — mutually exclusive with `body`.
  formData?: FormData;
  // Skip the bearer header even if a token is available (used for the few
  // endpoints whose auth is the body, e.g. /auth/refresh, /auth/logout).
  noAuth?: boolean;
  // Allow the caller to abort in-flight (e.g. on unmount).
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = apiBaseUrl() + path + buildQuery(opts.query);
  const headers: Record<string, string> = { Accept: "application/json" };

  if (!opts.noAuth) {
    const token = tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
    // fetch sets the multipart boundary itself when body is FormData.
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body,
    signal: opts.signal,
    credentials: "omit",
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (parsed && typeof parsed === "object" && "code" in (parsed as object)) {
      throw new ApiError(res.status, parsed as ApiErrorBody);
    }
    throw new ApiError(res.status, typeof parsed === "string" ? parsed : res.statusText);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "POST", body }),
  postForm: <T>(path: string, formData: FormData, opts?: Omit<RequestOptions, "method" | "formData">) =>
    request<T>(path, { ...opts, method: "POST", formData }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method">) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
