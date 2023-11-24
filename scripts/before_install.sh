#!/bin/bash

set -e

ls
 cd ./
echo "next listing"
ls
# Stop and remove existing Docker Compose services and containers
docker-compose -f docker-compose.yml down --volumes --remove-orphans
