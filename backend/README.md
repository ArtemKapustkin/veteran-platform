# backend

Go API service for the Veteran Platform.

## Stack

- HTTP: `fasthttp` + `fasthttp/router`
- ORM: `uptrace/bun` (PostgreSQL)
- DI: `go.uber.org/fx`
- CLI: `spf13/cobra`
- Validation: `go-ozzo/ozzo-validation/v4`
- Migrations: bun migrator with raw SQL

No `becommon` dependency — shared infrastructure code lives under `pkg/` in this repo.

## Layout

```
cmd/          Entry point (Cobra + fx wiring)
config/       Config struct + .env loading
di/           fx modules: providers + implementations
internal/     Domain code (HTTP handlers, services, repositories, models)
  http_handler/   fasthttp handlers, one Register* per resource
  model/          bun models with `bun:"table:..."` tags
  repository/     data access
  service/
    domain/       business rules (no transactions)
    application/  orchestration (transactions, side effects)
  consumer/       async / queue handlers (if/when needed)
migrations/   bun migrations (raw SQL via Migrations.MustRegister)
pkg/          local-only shared packages (logger, server, validation,
              auth/JWT, OTP/SMS, AI vision client, etc.)
deployments/  Dockerfile, docker-compose, helm
tests/        integration test helpers
```

## API contract

[`openapi.yaml`](openapi.yaml) is the source of truth. Update it before changing
handler signatures.

## Notes

- Single-tenant — no tenant entity or middleware.
- Errors: handlers `panic(err)` and a top-level recovery middleware (in `pkg/server`)
  maps known error types to HTTP responses. See docs-service for the pattern.
