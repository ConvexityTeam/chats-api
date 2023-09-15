FROM node:14.0.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . ./app
