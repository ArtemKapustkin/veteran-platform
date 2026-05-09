.PHONY: start stop logs build test tidy run migrate migrate-rollback migrate-status seed reset

start:
	docker compose -f deployments/docker-compose.yaml up -d --build

stop:
	docker compose -f deployments/docker-compose.yaml down

logs:
	docker compose -f deployments/docker-compose.yaml logs -f backend

build:
	CGO_ENABLED=0 go build -o bin/backend ./cmd

test:
	go test ./...

tidy:
	go mod tidy

run:
	go run ./cmd serve

migrate:
	go run ./cmd migrate

migrate-rollback:
	go run ./cmd migrate:rollback

migrate-status:
	go run ./cmd migrate:status

seed:
	docker compose -f deployments/docker-compose.yaml exec -T postgres \
		psql -v ON_ERROR_STOP=1 -U veteran -d veteran_platform \
		< deployments/seed/seed.sql

reset:
	docker compose -f deployments/docker-compose.yaml down -v
	docker compose -f deployments/docker-compose.yaml up -d --build postgres
	@echo "waiting for postgres..."
	@until docker compose -f deployments/docker-compose.yaml exec -T postgres \
		pg_isready -U veteran -d veteran_platform >/dev/null 2>&1; do sleep 1; done
	$(MAKE) migrate
	$(MAKE) seed
