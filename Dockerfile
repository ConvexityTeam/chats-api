FROM node:14.0.0-alpine
WORKDIR /app/api
COPY package.json ./
RUN npm i
COPY . .
