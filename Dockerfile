FROM node:14.0.0-alpine
WORKDIR /app/api
COPY package.json /app/api/
RUN npm i
COPY . /app/api/
