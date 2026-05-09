package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type VerificationAttempt struct {
	bun.BaseModel `bun:"table:vp.verification_attempts"`

	ID            uuid.UUID  `bun:"id,pk,type:uuid"`
	VeteranID     uuid.UUID  `bun:"veteran_id,type:uuid"`
	DocumentType  string     `bun:"document_type,type:vp.document_type"`
	SubmittedAt   time.Time  `bun:"submitted_at,nullzero,notnull,default:current_timestamp"`
	Decision      *string    `bun:"decision,type:vp.ai_decision"`
	Confidence    *float64   `bun:"confidence"`
	ExtractedName *string    `bun:"extracted_name"`
	ExtractedID   *string    `bun:"extracted_id"`
	Notes         *string    `bun:"notes"`
	DecidedAt     *time.Time `bun:"decided_at"`
	DecidedBy     *string    `bun:"decided_by"`
}
