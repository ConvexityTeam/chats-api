#!/bin/bash

set -e

# Stop and remove existing Docker Compose services and containers
docker-compose down --volumes --remove-orphans
