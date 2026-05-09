import { api } from "./client";
import type { AuthTokens, AuthTokensVeteran } from "./types";

export const authApi = {
  requestOtp: (phone: string) =>
    api.post<void>("/api/v1/auth/otp/request", { phone }, { noAuth: true }),

  verifyOtp: (phone: string, code: string) =>
    api.post<AuthTokensVeteran>(
      "/api/v1/auth/otp/verify",
      { phone, code },
      { noAuth: true },
    ),

  refresh: (refresh_token: string) =>
    api.post<AuthTokens>("/api/v1/auth/refresh", { refresh_token }, { noAuth: true }),

  logout: (refresh_token: string) =>
    api.post<void>("/api/v1/auth/logout", { refresh_token }, { noAuth: true }),

  adminLogin: (email: string, password: string) =>
    api.post<AuthTokens>(
      "/api/v1/admin/auth/login",
      { email, password },
      { noAuth: true },
    ),

  adminRefresh: (refresh_token: string) =>
    api.post<AuthTokens>(
      "/api/v1/admin/auth/refresh",
      { refresh_token },
      { noAuth: true },
    ),
};
