package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type AIResult struct {
	Decision      string  `json:"decision"`
	Confidence    float64 `json:"confidence"`
	ExtractedName *string `json:"extracted_name,omitempty"`
	ExtractedID   *string `json:"extracted_id,omitempty"`
	Notes         string  `json:"notes,omitempty"`
}

type VerificationDocument struct {
	ID           uuid.UUID  `json:"id"`
	DocumentType string     `json:"document_type"`
	UploadedAt   time.Time  `json:"uploaded_at"`
	AIResult     *AIResult  `json:"ai_result,omitempty"`
	// Who decided on this attempt (`ai` or `admin`) and when. Surfaced so the
	// admin queue can distinguish AI-only verdicts from prior admin overrides.
	DecidedBy *string    `json:"decided_by,omitempty"`
	DecidedAt *time.Time `json:"decided_at,omitempty"`
}

type VerificationState struct {
	Status      string                 `json:"status"`
	SubmittedAt *time.Time             `json:"submitted_at,omitempty"`
	DecidedAt   *time.Time             `json:"decided_at,omitempty"`
	Documents   []VerificationDocument `json:"documents"`
	AISummary   *string                `json:"ai_summary,omitempty"`
}

func FromAttempt(a *model.VerificationAttempt) VerificationDocument {
	doc := VerificationDocument{
		ID:           a.ID,
		DocumentType: a.DocumentType,
		UploadedAt:   a.SubmittedAt,
		DecidedBy:    a.DecidedBy,
		DecidedAt:    a.DecidedAt,
	}
	if a.Decision != nil {
		doc.AIResult = &AIResult{
			Decision:      *a.Decision,
			ExtractedName: a.ExtractedName,
			ExtractedID:   a.ExtractedID,
		}
		if a.Confidence != nil {
			doc.AIResult.Confidence = *a.Confidence
		}
		if a.Notes != nil {
			doc.AIResult.Notes = *a.Notes
		}
	}
	return doc
}
