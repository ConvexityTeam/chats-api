#!/bin/bash

set -e

# Stop and remove existing Docker Compose services and containers
docker-compose down -f ./docker-compose.yml --volumes --remove-orphans
