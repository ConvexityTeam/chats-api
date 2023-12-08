#!/bin/bash

set -e
# chmod +w /var/www
cd /var/www/app

# Build and start Docker Compose services
# docker-compose build

# Download Docker image from S3
aws s3 cp s3://chats-docker/chatsapi.zip /var/www/app/chatsapi.zip

# Load Docker image
docker load -i chatsapi.zip
docker-compose up -d
