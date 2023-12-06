#!/bin/bash

set -e

# Build and start Docker Compose services
docker-compose up -f ./docker-compose.yml -d --build
