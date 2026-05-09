.PHONY: start stop logs build test tidy run

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
