#!/bin/sh

ssh -o StrictHostKeyChecking=no ubuntu@$APP_URL << 'ENDSSH'
  cd /home/ubuntu/app
  # export $(cat .env | xargs)
  # docker login -u $CI_REGISTRY_USER -p $CI_JOB_TOKEN $CI_REGISTRY
  # docker pull $IMAGE:web
  # docker pull $IMAGE:nginx
  git checkout master
  git pull origin master
  docker-compose -f docker-compose.prod.yml up -d
ENDSSH