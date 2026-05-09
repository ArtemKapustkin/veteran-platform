.PHONY: start stop logs build test tidy run migrate migrate-rollback migrate-status

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
