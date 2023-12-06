#!/bin/bash

set -e

# Build and start Docker Compose services
docker-compose -f ./docker-compose.yml --build
