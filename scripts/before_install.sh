#!/bin/bash

set -e

sudo usermod -aG docker $USER

cd /var/www/app
# Stop and remove existing Docker Compose services and containers
sudo docker-compose down --volumes --remove-orphans
