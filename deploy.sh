#!/bin/bash
docker-compose -f docker-compose.prod.yml up --build --force-recreate --remove-orphans --detach
