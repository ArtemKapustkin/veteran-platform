package application

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/auth"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/otp"
)

const (
	maxOtpAttempts     = 5
	otpRateLimitWindow = time.Minute
	otpRateLimitMax    = 1
	otpHourlyWindow    = time.Hour
	otpHourlyMax       = 5
)

type AuthService struct {
	cfg           *config.Config
	log           *logger.Logger
	jwt           *auth.JWT
	otpSender     otp.Sender
	veterans      *repository.VeteranRepository
	otpCodes      *repository.OtpRepository
	refreshTokens *repository.RefreshTokenRepository
}

func NewAuthService(
	cfg *config.Config,
	log *logger.Logger,
	jwt *auth.JWT,
	otpSender otp.Sender,
	veterans *repository.VeteranRepository,
	otpCodes *repository.OtpRepository,
	refreshTokens *repository.RefreshTokenRepository,
) *AuthService {
	return &AuthService{
		cfg:           cfg,
		log:           log,
		jwt:           jwt,
		otpSender:     otpSender,
		veterans:      veterans,
		otpCodes:      otpCodes,
		refreshTokens: refreshTokens,
	}
}

func (s *AuthService) RequestOTP(ctx context.Context, phone string) error {
	now := time.Now()

	minuteCount, err := s.otpCodes.CountRecent(ctx, phone, now.Add(-otpRateLimitWindow))
	if err != nil {
		return err
	}
	if minuteCount >= otpRateLimitMax {
		return apperrors.NewRateLimitedError("спробуйте через хвилину")
	}
	hourCount, err := s.otpCodes.CountRecent(ctx, phone, now.Add(-otpHourlyWindow))
	if err != nil {
		return err
	}
	if hourCount >= otpHourlyMax {
		return apperrors.NewRateLimitedError("забагато запитів, спробуйте за годину")
	}

	code, err := otp.GenerateCode(s.cfg.OTPLength)
	if err != nil {
		return err
	}
	record := model.NewOtpCode(uuid.New(), phone, otp.HashCode(code), now.Add(s.cfg.OTPTTL), now)
	if err := s.otpCodes.Create(ctx, record); err != nil {
		return err
	}
	if err := s.otpSender.SendCode(ctx, phone, code); err != nil {
		s.log.Warn("OTP send failed", "phone", phone, "err", err.Error())
		if s.cfg.OTPMagicCode == "" {
			return apperrors.NewInternalError("failed to send OTP")
		}
	}
	return nil
}

func (s *AuthService) VerifyOTP(ctx context.Context, phone, code string) (*view.AuthTokens, error) {
	now := time.Now()

	if s.cfg.OTPMagicCode != "" && code == s.cfg.OTPMagicCode {
		s.log.Warn("OTP magic code accepted", "phone", phone)
		if record, _ := s.otpCodes.FindActiveByPhone(ctx, phone); record != nil {
			_ = s.otpCodes.MarkConsumed(ctx, record.ID, now)
		}
	} else {
		record, err := s.otpCodes.FindActiveByPhone(ctx, phone)
		if err != nil {
			return nil, err
		}
		if record == nil || !record.Active(now) {
			return nil, apperrors.NewUnauthorizedError("invalid or expired code")
		}
		if record.Attempts >= maxOtpAttempts {
			return nil, apperrors.NewRateLimitedError("too many attempts")
		}
		if record.CodeHash != otp.HashCode(code) {
			_ = s.otpCodes.IncrementAttempts(ctx, record.ID)
			return nil, apperrors.NewUnauthorizedError("invalid or expired code")
		}
		if err := s.otpCodes.MarkConsumed(ctx, record.ID, now); err != nil {
			return nil, err
		}
	}

	veteran, err := s.veterans.FindByPhone(ctx, phone)
	if err != nil {
		return nil, err
	}
	if veteran == nil {
		veteran = model.NewVeteranFromPhone(uuid.New(), phone, now)
		if err := s.veterans.Create(ctx, veteran); err != nil {
			return nil, err
		}
	}
	if veteran.AccountStatus == "blocked" {
		return nil, apperrors.NewForbiddenError("account is blocked")
	}

	return s.issueTokens(ctx, veteran, true)
}

func (s *AuthService) Refresh(ctx context.Context, token string) (*view.AuthTokens, error) {
	now := time.Now()
	hash := otp.HashCode(token)

	record, err := s.refreshTokens.FindByHash(ctx, hash)
	if err != nil {
		return nil, err
	}
	if record == nil || !record.Active(now) {
		return nil, apperrors.NewUnauthorizedError("invalid refresh token")
	}

	veteran, err := s.veterans.FindByID(ctx, record.VeteranID)
	if err != nil {
		return nil, err
	}
	if veteran == nil {
		return nil, apperrors.NewUnauthorizedError("invalid refresh token")
	}
	if veteran.AccountStatus == "blocked" {
		return nil, apperrors.NewForbiddenError("account is blocked")
	}

	if err := s.refreshTokens.TouchLastUsed(ctx, hash, now); err != nil {
		s.log.Warn("touch refresh token failed", "err", err.Error())
	}

	accessToken, err := s.jwt.Issue(veteran.ID, auth.Role(veteran.Role))
	if err != nil {
		return nil, err
	}

	return &view.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: token,
		ExpiresIn:    int64(s.jwt.AccessTTL().Seconds()),
		Role:         veteran.Role,
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.refreshTokens.Revoke(ctx, otp.HashCode(token), time.Now())
}

func (s *AuthService) issueTokens(ctx context.Context, veteran *model.Veteran, includeProfile bool) (*view.AuthTokens, error) {
	now := time.Now()

	accessToken, err := s.jwt.Issue(veteran.ID, auth.Role(veteran.Role))
	if err != nil {
		return nil, err
	}
	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}
	record := model.NewRefreshToken(uuid.New(), veteran.ID, otp.HashCode(refreshToken), now.Add(s.jwt.RefreshTTL()), now)
	if err := s.refreshTokens.Create(ctx, record); err != nil {
		return nil, err
	}

	res := &view.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.jwt.AccessTTL().Seconds()),
		Role:         veteran.Role,
	}
	if includeProfile {
		res.Veteran = view.FromVeteran(veteran)
	}
	return res, nil
}
