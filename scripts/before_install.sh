#!/bin/bash

set -e

cd /var/www/app
# Stop and remove existing Docker Compose services and containers
docker-compose down --volumes --remove-orphans
