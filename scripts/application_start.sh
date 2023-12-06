#!/bin/bash

set -e

# Restart Docker Compose services (if needed)
docker-compose -f docker-compose.yml up -d 
