.PHONY: help install setup dev build start stop clean logs migrate seed test

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install
	@echo "$(GREEN)Dependencies installed!$(NC)"

setup: ## Complete setup (install, docker, migrate, seed)
	@echo "$(BLUE)Starting complete setup...$(NC)"
	@$(MAKE) install
	@$(MAKE) docker-dev-up
	@sleep 5
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "$(GREEN)Setup complete! Run 'make dev' to start development server.$(NC)"

docker-dev-up: ## Start development Docker services (PostgreSQL & Redis)
	@echo "$(BLUE)Starting development Docker services...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Docker services started!$(NC)"

docker-dev-down: ## Stop development Docker services
	@echo "$(BLUE)Stopping development Docker services...$(NC)"
	docker-compose -f docker-compose.dev.yml down
	@echo "$(GREEN)Docker services stopped!$(NC)"

docker-up: ## Start all services (production mode)
	@echo "$(BLUE)Starting all services in production mode...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)All services started!$(NC)"

docker-down: ## Stop all services (production mode)
	@echo "$(BLUE)Stopping all services...$(NC)"
	docker-compose down
	@echo "$(GREEN)All services stopped!$(NC)"

docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)Docker images built!$(NC)"

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	npm run start:dev

build: ## Build application for production
	@echo "$(BLUE)Building application...$(NC)"
	npm run build
	@echo "$(GREEN)Build complete!$(NC)"

start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	npm run start:prod

migrate: ## Run database migrations
	@echo "$(BLUE)Running migrations...$(NC)"
	npx prisma migrate dev
	@echo "$(GREEN)Migrations complete!$(NC)"

migrate-deploy: ## Deploy migrations (production)
	@echo "$(BLUE)Deploying migrations...$(NC)"
	npx prisma migrate deploy
	@echo "$(GREEN)Migrations deployed!$(NC)"

seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	npx prisma db seed
	@echo "$(GREEN)Database seeded!$(NC)"

studio: ## Open Prisma Studio
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	npx prisma studio

generate: ## Generate Prisma Client
	@echo "$(BLUE)Generating Prisma Client...$(NC)"
	npx prisma generate
	@echo "$(GREEN)Prisma Client generated!$(NC)"

logs: ## Show application logs
	docker-compose logs -f app

logs-postgres: ## Show PostgreSQL logs
	docker-compose logs -f postgres

logs-redis: ## Show Redis logs
	docker-compose logs -f redis

lint: ## Lint code
	@echo "$(BLUE)Linting code...$(NC)"
	npm run lint

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	npm run format

clean: ## Clean up containers, volumes, and build artifacts
	@echo "$(RED)Cleaning up...$(NC)"
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	rm -rf dist node_modules
	@echo "$(GREEN)Cleanup complete!$(NC)"

reset-db: ## Reset database (WARNING: deletes all data)
	@echo "$(RED)Resetting database...$(NC)"
	npx prisma migrate reset --force
	@echo "$(GREEN)Database reset complete!$(NC)"

health: ## Check service health
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -f http://localhost:3000/api/v1/health || echo "$(RED)Service is down$(NC)"
	@echo "\n$(BLUE)PostgreSQL:$(NC)"
	@docker exec ecommerce_postgres pg_isready -U postgres || echo "$(RED)PostgreSQL is down$(NC)"
	@echo "$(BLUE)Redis:$(NC)"
	@docker exec ecommerce_redis redis-cli ping || echo "$(RED)Redis is down$(NC)"

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	@docker-compose ps