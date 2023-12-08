#!/bin/bash

set -e

# Build and start Docker Compose services

# Download Docker image from S3
aws s3 cp s3://chats-docker/chatsapi.tar.gz /var/www/app/chatsapi.tar.gz

cd /var/www/app

# Load Docker image
docker load -i chatsapi.tar.gz
docker run -d chatsapi
