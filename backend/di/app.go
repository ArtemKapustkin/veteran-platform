package di

import (
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/http_handler"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
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

			http_handler.NewHealthHandler,
		),
		fx.Invoke(
			http_handler.RegisterHealthHandler,
			func(*server.Server) {},
		),
	)
}
