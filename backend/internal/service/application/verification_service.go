package application

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/aivision"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

const matchConfidenceThreshold = 0.7

var allowedDocumentTypes = map[string]bool{
	"ubd_dia":          true,
	"ubd_paper":        true,
	"reestr_extract":   true,
	"form_6":           true,
	"military_book":    true,
	"family_fallen":    true,
	"self_declaration": true,
}

var allowedImageMimes = map[string]bool{
	"image/jpeg":   true,
	"image/jpg":    true,
	"image/png":    true,
	"image/heic":   true,
	"image/webp":   true,
	"application/pdf": true,
}

type VerificationFile struct {
	Bytes []byte
	Mime  string
}

type VerificationService struct {
	db       *bun.DB
	veterans *repository.VeteranRepository
	attempts *repository.VerificationRepository
	tokens   *repository.RefreshTokenRepository
	verifier aivision.Verifier
	log      *logger.Logger
}

func NewVerificationService(
	db *bun.DB,
	veterans *repository.VeteranRepository,
	attempts *repository.VerificationRepository,
	tokens *repository.RefreshTokenRepository,
	verifier aivision.Verifier,
	log *logger.Logger,
) *VerificationService {
	return &VerificationService{
		db: db, veterans: veterans, attempts: attempts, tokens: tokens, verifier: verifier, log: log,
	}
}

func (s *VerificationService) Submit(ctx context.Context, veteranID uuid.UUID, documentType string, files []VerificationFile) (*view.VerificationState, error) {
	if !allowedDocumentTypes[documentType] {
		return nil, apperrors.NewValidationError("unknown document_type", nil)
	}
	if len(files) == 0 {
		return nil, apperrors.NewValidationError("at least one file required", nil)
	}
	for _, f := range files {
		if !allowedImageMimes[strings.ToLower(f.Mime)] {
			return nil, apperrors.NewValidationError("unsupported file type: "+f.Mime, nil)
		}
	}

	veteran, err := s.veterans.FindByID(ctx, veteranID)
	if err != nil {
		return nil, err
	}
	if veteran == nil {
		return nil, apperrors.NewNotFoundError("veteran not found")
	}

	expectedName := ""
	if veteran.Fullname != nil {
		expectedName = *veteran.Fullname
	}

	now := time.Now()
	attempts := make([]*model.VerificationAttempt, 0, len(files))
	bestDecision := "no_match"
	bestConfidence := 0.0
	bestExtractedName := ""

	for _, f := range files {
		result, err := s.verifier.Verify(ctx, f.Bytes, f.Mime, documentType, expectedName)
		if err != nil {
			s.log.Error("ai vision call failed", "err", err.Error())
			result = &aivision.Result{
				Decision: "unreadable",
				Notes:    "AI verification failed: " + err.Error(),
			}
		}
		decided := now
		decidedBy := "ai"
		dec := result.Decision
		conf := result.Confidence
		a := &model.VerificationAttempt{
			ID:            uuid.New(),
			VeteranID:     veteranID,
			DocumentType:  documentType,
			SubmittedAt:   now,
			Decision:      &dec,
			Confidence:    &conf,
			DecidedAt:     &decided,
			DecidedBy:     &decidedBy,
			ExtractedName: nullableStr(result.ExtractedName),
			ExtractedID:   nullableStr(result.ExtractedID),
			Notes:         nullableStr(result.Notes),
		}
		attempts = append(attempts, a)

		if result.Decision == "match" && result.Confidence > bestConfidence {
			bestConfidence = result.Confidence
			bestDecision = "match"
			if result.ExtractedName != "" {
				bestExtractedName = result.ExtractedName
			}
		}
	}

	// AI's confident `match` flips the veteran straight to `approved`.
	// Anything else — `no_match`, `unreadable`, or an outright AI error —
	// queues the submission for human review (`pending_review`) so an
	// admin can override the decision instead of leaving the veteran
	// stuck on a terminal-feeling `rejected` flag they didn't earn.
	finalStatus := "pending_review"
	finalVerified := false
	if bestDecision == "match" && bestConfidence >= matchConfidenceThreshold {
		finalStatus = "approved"
		finalVerified = true
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		for _, a := range attempts {
			if _, err := tx.NewInsert().Model(a).Exec(ctx); err != nil {
				return err
			}
		}
		upd := tx.NewUpdate().
			Model((*model.Veteran)(nil)).
			Set("verification_status = ?", finalStatus).
			Set("verified = ?", finalVerified).
			Set("updated_at = ?", now)
		if finalVerified && bestExtractedName != "" {
			upd = upd.Set("fullname = ?", bestExtractedName)
		}
		_, err := upd.Where("id = ?", veteranID).Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}

	return s.GetState(ctx, veteranID)
}

func (s *VerificationService) GetState(ctx context.Context, veteranID uuid.UUID) (*view.VerificationState, error) {
	veteran, err := s.veterans.FindByID(ctx, veteranID)
	if err != nil {
		return nil, err
	}
	if veteran == nil {
		return nil, apperrors.NewNotFoundError("veteran not found")
	}
	rows, err := s.attempts.ListByVeteran(ctx, veteranID)
	if err != nil {
		return nil, err
	}

	state := &view.VerificationState{Status: veteran.VerificationStatus}
	state.Documents = make([]view.VerificationDocument, 0, len(rows))
	for i := range rows {
		state.Documents = append(state.Documents, view.FromAttempt(&rows[i]))
	}
	if len(rows) > 0 {
		latest := rows[0]
		state.SubmittedAt = &latest.SubmittedAt
		state.DecidedAt = latest.DecidedAt
		if latest.Notes != nil {
			summary := *latest.Notes
			state.AISummary = &summary
		}
	}
	return state, nil
}

func (s *VerificationService) AdminVerify(ctx context.Context, veteranID uuid.UUID, approved bool, note string) (*view.VerificationState, error) {
	veteran, err := s.veterans.FindByID(ctx, veteranID)
	if err != nil {
		return nil, err
	}
	if veteran == nil {
		return nil, apperrors.NewNotFoundError("veteran not found")
	}

	// Re-use the document_type from the most recent submission so the audit
	// row reads as "admin override of <that document>" instead of always
	// pinning admin decisions to `self_declaration`. Falls back to
	// `self_declaration` for the no-prior-attempt edge case (e.g. admin
	// approving someone manually before they ever submitted).
	prior, err := s.attempts.ListByVeteran(ctx, veteranID)
	if err != nil {
		return nil, err
	}
	docType := "self_declaration"
	if len(prior) > 0 {
		docType = prior[0].DocumentType
	}

	now := time.Now()
	status := "rejected"
	if approved {
		status = "approved"
	}
	decidedBy := "admin"
	decision := "no_match"
	if approved {
		decision = "match"
	}
	conf := 1.0
	a := &model.VerificationAttempt{
		ID:           uuid.New(),
		VeteranID:    veteranID,
		DocumentType: docType,
		SubmittedAt:  now,
		Decision:     &decision,
		Confidence:   &conf,
		DecidedAt:    &now,
		DecidedBy:    &decidedBy,
		Notes:        nullableStr(note),
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewInsert().Model(a).Exec(ctx); err != nil {
			return err
		}
		_, err := tx.NewUpdate().
			Model((*model.Veteran)(nil)).
			Set("verification_status = ?", status).
			Set("verified = ?", approved).
			Set("updated_at = ?", now).
			Where("id = ?", veteranID).
			Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.GetState(ctx, veteranID)
}

func (s *VerificationService) AdminBlock(ctx context.Context, veteranID uuid.UUID) error {
	veteran, err := s.veterans.FindByID(ctx, veteranID)
	if err != nil {
		return err
	}
	if veteran == nil {
		return apperrors.NewNotFoundError("veteran not found")
	}
	now := time.Now()
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewUpdate().
			Model((*model.Veteran)(nil)).
			Set("account_status = ?", "blocked").
			Set("updated_at = ?", now).
			Where("id = ?", veteranID).
			Exec(ctx); err != nil {
			return err
		}
		_, err := tx.NewUpdate().
			Model((*model.RefreshToken)(nil)).
			Set("revoked_at = ?", now).
			Where("veteran_id = ? AND revoked_at IS NULL", veteranID).
			Exec(ctx)
		return err
	})
}

func nullableStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
