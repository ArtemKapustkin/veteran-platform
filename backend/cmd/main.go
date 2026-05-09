package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
	"github.com/uptrace/bun/migrate"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/di"
	"github.com/ArtemKapustkin/veteran-platform/backend/migrations"
)

func main() {
	_ = godotenv.Load("./config/.env")

	root := &cobra.Command{Use: "backend"}
	root.AddCommand(serveCmd(), migrateCmd(), migrateRollbackCmd(), migrateStatusCmd())

	if err := root.Execute(); err != nil {
		log.Println(err)
		os.Exit(1)
	}
}

func serveCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start the HTTP server",
		Run: func(*cobra.Command, []string) {
			fx.New(di.App()).Run()
		},
	}
}

func migrateCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "migrate",
		Short: "Apply pending database migrations",
		RunE: func(*cobra.Command, []string) error {
			return runMigrator(func(ctx context.Context, m *migrate.Migrator) error {
				if err := m.Init(ctx); err != nil {
					return err
				}
				group, err := m.Migrate(ctx)
				if err != nil {
					return err
				}
				if group.IsZero() {
					fmt.Println("no new migrations")
					return nil
				}
				fmt.Printf("migrated to %s\n", group)
				return nil
			})
		},
	}
}

func migrateRollbackCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "migrate:rollback",
		Short: "Roll back the last migration group",
		RunE: func(*cobra.Command, []string) error {
			return runMigrator(func(ctx context.Context, m *migrate.Migrator) error {
				group, err := m.Rollback(ctx)
				if err != nil {
					return err
				}
				if group.IsZero() {
					fmt.Println("nothing to roll back")
					return nil
				}
				fmt.Printf("rolled back %s\n", group)
				return nil
			})
		},
	}
}

func migrateStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "migrate:status",
		Short: "Show migration status",
		RunE: func(*cobra.Command, []string) error {
			return runMigrator(func(ctx context.Context, m *migrate.Migrator) error {
				ms, err := m.MigrationsWithStatus(ctx)
				if err != nil {
					return err
				}
				fmt.Printf("applied:    %s\n", ms.Applied())
				fmt.Printf("unapplied:  %s\n", ms.Unapplied())
				fmt.Printf("last group: %s\n", ms.LastGroup())
				return nil
			})
		},
	}
}

func runMigrator(fn func(context.Context, *migrate.Migrator) error) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	sqlDB := sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(cfg.DSN())))
	defer sqlDB.Close()
	db := bun.NewDB(sqlDB, pgdialect.New())
	m := migrate.NewMigrator(db, migrations.Migrations)
	return fn(context.Background(), m)
}
