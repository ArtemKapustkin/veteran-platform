package application

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/otp"
)

const (
	maxGroupSize = 4
	// groupReservationTTL is how long a `pending_companions`
	// registration holds reserved seats before the expirer cancels it
	// and frees the quota. Short enough that an organizer who shares a
	// link impulsively doesn't tie up seats overnight; long enough for
	// a buddy to notice a Telegram message and sign in.
	groupReservationTTL = 2 * time.Hour
	expirerInterval     = time.Minute
	// inviteTokenBytes is the entropy size for `invite_token`. 18 bytes
	// → 24 base64 characters; collision-resistant for a humble database
	// and short enough to keep the share URL friendly inside Telegram.
	inviteTokenBytes = 18
)

type RegistrationService struct {
	db       *bun.DB
	events   *repository.EventRepository
	regs     *repository.RegistrationRepository
	veterans *repository.VeteranRepository
	sender   otp.Sender
	log      *logger.Logger
}

func NewRegistrationService(
	db *bun.DB,
	events *repository.EventRepository,
	regs *repository.RegistrationRepository,
	veterans *repository.VeteranRepository,
	sender otp.Sender,
	log *logger.Logger,
) *RegistrationService {
	return &RegistrationService{
		db: db, events: events, regs: regs, veterans: veterans, sender: sender, log: log,
	}
}

type CreateRegistrationInput struct {
	// Seats is the total group size including the creator (1..4).
	// Solo registration uses Seats=1; group uses Seats>=2 and the
	// service generates Seats-1 invitation tokens.
	Seats int
}

func (s *RegistrationService) Create(ctx context.Context, eventID, creatorID uuid.UUID, in CreateRegistrationInput) (*view.Registration, error) {
	if in.Seats < 1 || in.Seats > maxGroupSize {
		return nil, apperrors.NewValidationError("seats must be between 1 and 4", nil)
	}

	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if event == nil || event.Status != "published" {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if !event.StartsAt.After(time.Now()) {
		return nil, apperrors.NewConflictError("event already started")
	}

	creator, err := s.veterans.FindByID(ctx, creatorID)
	if err != nil {
		return nil, err
	}
	if creator == nil {
		return nil, apperrors.NewUnauthorizedError("veteran not found")
	}
	if event.VerifiedOnly && !creator.Verified {
		return nil, apperrors.NewForbiddenError("event requires verified veteran status")
	}

	if existing, err := s.regs.FindActiveByEventAndVeteran(ctx, eventID, creatorID); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, apperrors.NewConflictError("you already have an active registration for this event")
	}

	now := time.Now()
	registration := &model.Registration{
		ID:        uuid.New(),
		EventID:   eventID,
		VeteranID: creatorID,
		Seats:     in.Seats,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if in.Seats == 1 {
		registration.Status = "confirmed"
		registration.ConfirmedAt = &now
	} else {
		registration.Status = "pending_companions"
		expires := now.Add(groupReservationTTL)
		registration.ReservationExpiresAt = &expires
	}

	companionCount := 0
	if in.Seats > 1 {
		companionCount = in.Seats - 1
	}
	companions := make([]*model.RegistrationCompanion, 0, companionCount)
	for i := 0; i < companionCount; i++ {
		token, err := generateInviteToken()
		if err != nil {
			return nil, err
		}
		companions = append(companions, &model.RegistrationCompanion{
			ID:             uuid.New(),
			RegistrationID: registration.ID,
			InviteToken:    &token,
			Status:         "pending",
			CreatedAt:      now,
		})
	}
	registration.Companions = companions

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("seats_taken = seats_taken + ?", in.Seats).
			Set("updated_at = ?", now).
			Where("id = ? AND seats_taken + ? <= quota AND status = 'published'", eventID, in.Seats).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return apperrors.NewConflictError("event quota exhausted")
		}
		if _, err := tx.NewInsert().Model(registration).Exec(ctx); err != nil {
			return err
		}
		for _, c := range companions {
			if _, err := tx.NewInsert().Model(c).Exec(ctx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return view.FromRegistration(registration), nil
}

// generateInviteToken returns a URL-safe random token used in the
// public Telegram-share link `<frontend>/invitations/{token}`. We
// strip padding so the token round-trips cleanly inside an
// `https://t.me/share/url?url=…` query parameter.
func generateInviteToken() (string, error) {
	buf := make([]byte, inviteTokenBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return strings.TrimRight(base64.URLEncoding.EncodeToString(buf), "="), nil
}

// Cancel handles two distinct intents on the same endpoint:
//
//   - Organizer cancels: tear down the whole group, release every
//     reserved seat back to the quota.
//   - Confirmed companion cancels: leave the group only — flip their
//     companion row to declined, decrement the registration's seat
//     count, and release a single seat. The organizer (and any other
//     confirmed companions) keep their spots.
//
// Treating "leave" as a Cancel keeps the frontend's heart toggle
// symmetric across organizers and recipients without a second
// endpoint.
func (s *RegistrationService) Cancel(ctx context.Context, eventID, registrationID, callerID uuid.UUID) error {
	now := time.Now()
	reg, err := s.regs.FindByID(ctx, registrationID)
	if err != nil {
		return err
	}
	if reg == nil || reg.EventID != eventID {
		return apperrors.NewNotFoundError("registration not found")
	}
	if reg.Status == "cancelled" || reg.Status == "expired" {
		return nil
	}
	if reg.VeteranID == callerID {
		return s.releaseAndCancel(ctx, reg, "cancelled", now)
	}
	return s.leaveGroup(ctx, reg, callerID, now)
}

// leaveGroup demotes the caller's confirmed companion row to declined
// and frees a single seat back to the public quota. Returns 403 when
// the caller never claimed a slot here, matching the previous
// "not your registration" semantics so the frontend toast keeps
// working.
func (s *RegistrationService) leaveGroup(ctx context.Context, reg *model.Registration, callerID uuid.UUID, now time.Time) error {
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "declined").
			Set("responded_at = ?", now).
			Where("registration_id = ? AND veteran_id = ? AND status = 'confirmed'", reg.ID, callerID).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return apperrors.NewForbiddenError("not your registration")
		}
		// Drop the freed seat from the registration's promised group
		// size and the denormalized `events.seats_taken` counter so
		// the slot reappears in the public quota.
		if _, err := tx.NewUpdate().
			Model((*model.Registration)(nil)).
			Set("seats = GREATEST(seats - 1, 1)").
			Set("updated_at = ?", now).
			Where("id = ?", reg.ID).
			Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("seats_taken = GREATEST(seats_taken - 1, 0)").
			Set("updated_at = ?", now).
			Where("id = ?", reg.EventID).
			Exec(ctx); err != nil {
			return err
		}
		return nil
	})
}

func (s *RegistrationService) releaseAndCancel(ctx context.Context, reg *model.Registration, finalStatus string, now time.Time) error {
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.Registration)(nil)).
			Set("status = ?", finalStatus).
			Set("cancelled_at = ?", now).
			Set("updated_at = ?", now).
			Where("id = ? AND status IN ('pending_companions', 'confirmed')", reg.ID).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return nil
		}
		_, err = tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("seats_taken = GREATEST(seats_taken - ?, 0)", reg.Seats).
			Set("updated_at = ?", now).
			Where("id = ?", reg.EventID).
			Exec(ctx)
		return err
	})
}

func (s *RegistrationService) ListMine(ctx context.Context, veteranID uuid.UUID, status *string, limit int) (*view.RegistrationPage, error) {
	rows, err := s.regs.ListMine(ctx, veteranID, status, limit)
	if err != nil {
		return nil, err
	}
	// Caller may appear here either as the organizer or as a confirmed
	// companion in someone else's group. The audience-aware view
	// keeps invite_tokens visible only on registrations they own.
	return mapRegistrationPageFor(rows, veteranID), nil
}

func (s *RegistrationService) ListEventRoster(ctx context.Context, eventID, callerID uuid.UUID, isAdmin bool) (*view.RegistrationPage, error) {
	if !isAdmin {
		event, err := s.events.FindByID(ctx, eventID)
		if err != nil {
			return nil, err
		}
		if event == nil {
			return nil, apperrors.NewNotFoundError("event not found")
		}
		if event.CreatedByID != callerID {
			return nil, apperrors.NewForbiddenError("organizer or admin only")
		}
	}
	rows, err := s.regs.ListByEvent(ctx, eventID, 200)
	if err != nil {
		return nil, err
	}
	// Roster is multi-organizer: redact every companion token by
	// passing a Nil viewer so no row matches `reg.veteran_id`.
	return mapRegistrationPageFor(rows, uuid.Nil), nil
}

// LookupInvitation resolves a public Telegram-share token to an event
// preview + organizer name so the landing page can render before the
// recipient signs in. `viewerID` may be uuid.Nil — when set, the
// response includes whether the viewer has already claimed this slot
// so the UI can route them straight to the event.
func (s *RegistrationService) LookupInvitation(ctx context.Context, token string, viewerID uuid.UUID) (*view.InvitationLookup, error) {
	companion, err := s.regs.FindCompanionByInviteToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if companion == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	reg, err := s.regs.FindByID(ctx, companion.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	event, err := s.events.FindByID(ctx, reg.EventID)
	if err != nil {
		return nil, err
	}
	organizer, err := s.veterans.FindByID(ctx, reg.VeteranID)
	if err != nil {
		return nil, err
	}
	out := &view.InvitationLookup{
		Token:          token,
		RegistrationID: reg.ID,
		Event:          view.FromEvent(event),
		SeatsInGroup:   reg.Seats,
		Status:         companion.Status,
	}
	if reg.ReservationExpiresAt != nil {
		out.ReservationExpiresAt = *reg.ReservationExpiresAt
	}
	if organizer != nil {
		out.InvitedByFullname = organizer.Fullname
	}
	if viewerID != uuid.Nil && companion.VeteranID != nil && *companion.VeteranID == viewerID && companion.Status == "confirmed" {
		out.AlreadyClaimedByMe = true
	}
	return out, nil
}

// ClaimInvitation confirms the slot owned by `token` for the calling
// veteran. The caller can be anyone with the link — that's by design;
// the link is the credential. Idempotent: a viewer who already
// claimed the slot just gets the current registration back.
func (s *RegistrationService) ClaimInvitation(ctx context.Context, token string, caller *model.Veteran) (*view.Registration, error) {
	now := time.Now()
	companion, err := s.regs.FindCompanionByInviteToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if companion == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	reg, err := s.regs.FindByID(ctx, companion.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg == nil {
		return nil, apperrors.NewNotFoundError("registration not found")
	}
	if reg.VeteranID == caller.ID {
		return nil, apperrors.NewConflictError("you organized this group; you're already in")
	}

	if companion.Status == "confirmed" && companion.VeteranID != nil && *companion.VeteranID == caller.ID {
		full, err := s.regs.FindByIDWithCompanions(ctx, reg.ID)
		if err != nil {
			return nil, err
		}
		return view.FromRegistration(full), nil
	}
	if companion.Status != "pending" {
		return nil, apperrors.NewConflictError("invitation already used")
	}
	if reg.Status != "pending_companions" {
		return nil, apperrors.NewConflictError("registration is no longer accepting companions")
	}
	if reg.ReservationExpiresAt == nil || !reg.ReservationExpiresAt.After(now) {
		return nil, apperrors.NewConflictError("invitation expired")
	}
	event, err := s.events.FindByID(ctx, reg.EventID)
	if err != nil {
		return nil, err
	}
	if event != nil && event.VerifiedOnly && !caller.Verified {
		return nil, apperrors.NewForbiddenError("event requires verified veteran status")
	}

	if existing, err := s.regs.FindActiveByEventAndVeteran(ctx, reg.EventID, caller.ID); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, apperrors.NewConflictError("you already have an active registration for this event")
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "confirmed").
			Set("veteran_id = ?", caller.ID).
			Set("fullname = ?", caller.Fullname).
			Set("responded_at = ?", now).
			Where("id = ? AND status = 'pending'", companion.ID).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return apperrors.NewConflictError("invitation already used")
		}
		count, err := tx.NewSelect().
			Model((*model.RegistrationCompanion)(nil)).
			Where("registration_id = ? AND status = 'pending'", reg.ID).
			Count(ctx)
		if err != nil {
			return err
		}
		if count == 0 {
			if _, err := tx.NewUpdate().
				Model((*model.Registration)(nil)).
				Set("status = ?", "confirmed").
				Set("confirmed_at = ?", now).
				Set("reservation_expires_at = NULL").
				Set("updated_at = ?", now).
				Where("id = ?", reg.ID).
				Exec(ctx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	full, err := s.regs.FindByIDWithCompanions(ctx, reg.ID)
	if err != nil {
		return nil, err
	}
	// Caller is the recipient (a companion), so redact every
	// invite_token — including their own, which they no longer need.
	return view.FromRegistrationFor(full, caller.ID), nil
}

// DeclineInvitation cancels the whole group reservation when one of
// the invitees declines via their share link. Matches the old
// SMS-flow semantics: a single decline releases every seat back to
// the quota so the organizer can re-share or pick someone else.
func (s *RegistrationService) DeclineInvitation(ctx context.Context, token string, caller *model.Veteran) (*view.Registration, error) {
	now := time.Now()
	companion, err := s.regs.FindCompanionByInviteToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if companion == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	if companion.Status != "pending" {
		return nil, apperrors.NewConflictError("invitation already used")
	}
	reg, err := s.regs.FindByID(ctx, companion.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg == nil {
		return nil, apperrors.NewNotFoundError("registration not found")
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "declined").
			Set("veteran_id = ?", caller.ID).
			Set("fullname = ?", caller.Fullname).
			Set("responded_at = ?", now).
			Where("id = ?", companion.ID).
			Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "declined").
			Set("responded_at = ?", now).
			Where("registration_id = ? AND status = 'pending'", reg.ID).
			Exec(ctx); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if reg.Status == "pending_companions" || reg.Status == "confirmed" {
		if err := s.releaseAndCancel(ctx, reg, "cancelled", now); err != nil {
			return nil, err
		}
	}
	full, err := s.regs.FindByIDWithCompanions(ctx, reg.ID)
	if err != nil {
		return nil, err
	}
	return view.FromRegistrationFor(full, caller.ID), nil
}

func (s *RegistrationService) ExpireStale(ctx context.Context) (int, error) {
	now := time.Now()
	var stale []model.Registration
	if err := s.db.NewSelect().
		Model(&stale).
		Where("status = 'pending_companions' AND reservation_expires_at < ?", now).
		Limit(100).
		Scan(ctx); err != nil {
		return 0, err
	}
	count := 0
	for i := range stale {
		if err := s.releaseAndCancel(ctx, &stale[i], "expired", now); err != nil {
			s.log.Error("expire registration failed", "id", stale[i].ID, "err", err.Error())
			continue
		}
		count++
	}
	return count, nil
}

func StartRegistrationExpirer(lc fx.Lifecycle, svc *RegistrationService, log *logger.Logger) {
	ctx, cancel := context.WithCancel(context.Background())
	ticker := time.NewTicker(expirerInterval)
	lc.Append(fx.Hook{
		OnStart: func(_ context.Context) error {
			log.Info("registration expirer started", "interval", expirerInterval.String())
			go func() {
				for {
					select {
					case <-ctx.Done():
						return
					case <-ticker.C:
						if n, err := svc.ExpireStale(ctx); err != nil {
							log.Error("expire stale registrations", "err", err.Error())
						} else if n > 0 {
							log.Info("expired stale registrations", "count", n)
						}
					}
				}
			}()
			return nil
		},
		OnStop: func(_ context.Context) error {
			cancel()
			ticker.Stop()
			return nil
		},
	})
}

// mapRegistrationPageFor converts a model slice into a paged view,
// redacting companion `invite_token`s on every row whose organizer
// isn't `viewerID`. Pass `uuid.Nil` to redact tokens on every row
// (e.g. admin / multi-organizer roster views).
func mapRegistrationPageFor(rows []model.Registration, viewerID uuid.UUID) *view.RegistrationPage {
	items := make([]*view.Registration, 0, len(rows))
	for i := range rows {
		items = append(items, view.FromRegistrationFor(&rows[i], viewerID))
	}
	return &view.RegistrationPage{
		Items:      items,
		Pagination: view.Pagination{NextCursor: nil},
	}
}
