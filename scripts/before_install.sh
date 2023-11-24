#!/bin/bash

set -e

# Stop and remove existing Docker Compose services and containers
docker-compose -f ../docker-compose.yml down --volumes --remove-orphans
