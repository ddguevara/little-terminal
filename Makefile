SHELL := /bin/bash
PYTHON ?= python3
UVICORN ?= uvicorn
PYTHON_SERVICE_URL ?= http://localhost:8000
PYTHON_APP := python_service.main:build_app
MARKDOWNLINT := npx --yes markdownlint-cli2

.PHONY: install install-node install-python start-node start-python dev lint lint-md clean

install: install-node install-python

install-node:
	@echo "Installing Node dependencies"
	npm install

install-python:
	@echo "Installing Python dependencies"
	$(PYTHON) -m pip install -r python_service/requirements.txt

start-node:
	@echo "Starting Express server on http://localhost:3000"
	PYTHON_SERVICE_URL=$(PYTHON_SERVICE_URL) npm start

start-python:
	@echo "Starting FastAPI bridge on $(PYTHON_SERVICE_URL)"
	$(UVICORN) $(PYTHON_APP) --factory --reload

dev:
	@echo "Launching FastAPI bridge and Express server"
	@trap 'kill 0' EXIT; \
		$(UVICORN) $(PYTHON_APP) --factory --reload & \
		PYTHON_SERVICE_URL=$(PYTHON_SERVICE_URL) npm start

lint: lint-md

lint-md:
	$(MARKDOWNLINT) '**/*.md' '!node_modules'

clean:
	rm -rf node_modules
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +
