#!/bin/bash

set -e

echo "next listing"
ls
# Stop and remove existing Docker Compose services and containers
# docker-compose down --volumes --remove-orphans
