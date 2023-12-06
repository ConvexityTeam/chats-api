#!/bin/bash

set -e

cd /var/www/app

# Restart Docker Compose services (if needed)
docker volume prune -f
docker image prune -f
