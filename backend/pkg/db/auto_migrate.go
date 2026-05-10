package db

import (
	"context"
	"fmt"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/migrations"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

// AutoMigrate runs pending bun migrations during fx OnStart so each
// fresh container picks up schema changes before serving traffic.
// Bun's migrator takes a row-level lock on the bun_migrations table,
// so concurrent boots after a deploy won't race.
func AutoMigrate(lc fx.Lifecycle, db *bun.DB, log *logger.Logger) {
	m := migrate.NewMigrator(db, migrations.Migrations)
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			if err := m.Init(ctx); err != nil {
				return fmt.Errorf("migrate init: %w", err)
			}
			group, err := m.Migrate(ctx)
			if err != nil {
				return fmt.Errorf("migrate: %w", err)
			}
			if group.IsZero() {
				log.Info("migrations: up to date")
				return nil
			}
			log.Info("migrations: applied", "group", group.String())
			return nil
		},
	})
}
