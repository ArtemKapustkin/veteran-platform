export { api, apiBaseUrl, ApiError, setTokenProvider } from "./client";
export { authApi } from "./auth";
export { eventsApi } from "./events";
export { meApi } from "./me";
export { communitiesApi } from "./communities";
export { referenceApi } from "./reference";
export { verificationApi } from "./verification";
export { adminVeteransApi } from "./admin";
export type { AdminVeteranDetail } from "./admin";
export type {
  AIDecision,
  AIResult,
  VerificationDocument,
  VerificationState,
} from "./verification";
export * from "./types";
