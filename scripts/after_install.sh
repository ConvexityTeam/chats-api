#!/bin/bash

set -e

# Build and start Docker Compose services
docker-compose build -f ./docker-compose.yml up -d 
