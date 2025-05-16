# include .env

DEFAULT: help

# ==================================================================================== #
# HELPERS
# ==================================================================================== #

## help: print this help message
.PHONY: help
help:
	@echo 'Usage:'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' |  sed -e 's/^/ /'

.PHONY: confirm
confirm:
	@echo -n 'Are you sure? [y/N] ' && read ans && [ $${ans:-N} = y ]

# ==================================================================================== #
# DEVELOPMENT
# ==================================================================================== #

## run/api: run the api application
.PHONY: run/api
run/api:
	cd backend && go run main.go

## run/api/hot: run the api application with hot reload
.PHONY: run/api/hot
run/api/hot:
	cd backend && air

## db/start: start the database container
.PHONY: db/start
db/start:
	@echo 'Starting database...'
	docker-compose up -d db
	@echo 'Waiting for database to be ready...'
	@until docker-compose exec -T db pg_isready -U user -d bloc; do sleep 1; done

## db/stop: stop the database container
.PHONY: db/stop
db/stop:
	@echo 'Stopping database...'
	docker-compose down

## db/psql: connect to the database using psql
.PHONY: db/psql
db/psql:
	docker-compose exec db psql -U user -d bloc

## db/migrations/new name=$1: create a new database migration
.PHONY: db/migrations/new
db/migrations/new:
	@echo 'Creating migration files for ${name}...'
	migrate create -seq -ext=.sql -dir=./backend/migrations ${name}

## db/migrations/up: apply all up database migrations
.PHONY: db/migrations/up
db/migrations/up:
	@echo 'Running up migrations...'
	migrate -path ./backend/migrations -database "postgres://user:password@localhost:5432/bloc?sslmode=disable" up

## db/migrations/down: apply all down database migrations
.PHONY: db/migrations/down
db/migrations/down: confirm
	@echo 'Running down migrations...'
	migrate -path ./backend/migrations -database "postgres://user:password@localhost:5432/bloc?sslmode=disable" down

## dev: start the development environment
.PHONY: dev
dev: db/start db/migrations/up run/api/hot
