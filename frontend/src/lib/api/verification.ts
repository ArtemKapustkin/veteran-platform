// Veteran-side verification flow. Mirrors `backend/internal/view/verification.go`
// and the two endpoints in `backend/internal/http_handler/verification_handler.go`:
// `GET /api/v1/me/verification` and `POST /api/v1/me/verification` (multipart).

import { api } from "./client";
import type { DocumentType, VerificationStatus } from "./types";

export interface AIResult {
  decision: string;
  confidence: number;
  extracted_name?: string | null;
  extracted_id?: string | null;
  notes?: string;
}

export interface VerificationDocument {
  id: string;
  document_type: DocumentType;
  uploaded_at: string;
  ai_result?: AIResult;
}

export interface VerificationState {
  status: VerificationStatus;
  submitted_at?: string;
  decided_at?: string;
  documents: VerificationDocument[];
  ai_summary?: string;
}

export const verificationApi = {
  get: () => api.get<VerificationState>("/api/v1/me/verification"),

  submit: (documentType: DocumentType, files: File[]) => {
    const fd = new FormData();
    fd.append("document_type", documentType);
    for (const f of files) fd.append("files", f);
    return api.postForm<VerificationState>("/api/v1/me/verification", fd);
  },
};
