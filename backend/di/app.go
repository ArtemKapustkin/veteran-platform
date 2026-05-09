package di

import (
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/http_handler"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/auth"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/db"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/otp"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

func App() fx.Option {
	return fx.Options(
		fx.Provide(
			config.Load,
			logger.New,
			db.New,

			server.NewRouter,
			server.New,

			func(cfg *config.Config) *auth.JWT {
				return auth.NewJWT(cfg.JWTSecret, cfg.AuthAccessTTL, cfg.AuthRefreshTTL)
			},
			server.NewAuthMiddleware,

			otp.NewSender,

			repository.NewVeteranRepository,
			repository.NewOtpRepository,
			repository.NewRefreshTokenRepository,
			repository.NewEventRepository,
			repository.NewRegistrationRepository,

			application.NewAuthService,
			application.NewVeteranService,
			application.NewEventService,
			application.NewRegistrationService,

			http_handler.NewHealthHandler,
			http_handler.NewAuthHandler,
			http_handler.NewMeHandler,
			http_handler.NewEventHandler,
			http_handler.NewAdminEventHandler,
			http_handler.NewRegistrationHandler,
		),
		fx.Invoke(
			http_handler.RegisterHealthHandler,
			http_handler.RegisterAuthHandler,
			http_handler.RegisterMeHandler,
			http_handler.RegisterEventHandler,
			http_handler.RegisterAdminEventHandler,
			http_handler.RegisterRegistrationHandler,
			application.StartRegistrationExpirer,
			func(*server.Server) {},
		),
	)
}
