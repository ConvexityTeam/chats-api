#!/bin/bash

set -e

cd /var/www/app
# Perform any validation checks here, e.g., health checks, connectivity checks, etc.

# Example: Check if a service is running
if ! docker-compose ps -q | grep -q backend; then
    echo "Error: The required service is not running."
    exit 1
fi

if ! docker-compose ps -q | grep -q compose; then
    echo "Error: The required service is not running."
    exit 1
fi
