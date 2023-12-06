#!/bin/bash

set -e

chmod +w /var/www/app

cd /var/www/app
# Stop and remove existing Docker Compose services and containers
docker-compose down --volumes --remove-orphans
