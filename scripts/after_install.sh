#!/bin/bash

set -e

cd /var/www/app

# Build and start Docker Compose services
docker-compose build
docker-compose up -d
