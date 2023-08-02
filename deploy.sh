#!/bin/bash
docker save "registry.gitlab.com/convexityteam/chats-api:latest" | docker run
