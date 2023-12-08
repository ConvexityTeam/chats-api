#!/bin/bash
set -e

# Build and start Docker Compose services

# # Download Docker image from S3
# aws s3 cp s3://chats-docker/backend.tar.gz /var/www/app/backend.tar.gz
# aws s3 cp s3://chats-docker/consumer.tar.gz /var/www/app/consumer.tar.gz
aws s3 cp s3://chats-docker/chatsapi.tar /var/www/app/chatsapi.tar

# cd /var/www/app
# aws s3 cp s3://chats-docker/backend.tar .
# aws s3 cp s3://chats-docker/consumer.tar .

# docker load -i backend.tar
# docker load -i consumer.tar

docker-compose up -d

# # Load Docker image
# docker load -i backend.tar.gz
# docker load -i consumer.tar.gz
# docker run -d backend
# # docker run -d consumer
docker load -i chatsapi.tar
# docker run -d chatsapi
docker-compose up -d
