#!/bin/bash

set -e
chmod +w /var/www
cd /var/www/app

# Build and start Docker Compose services
docker-compose build
docker-compose up -d
