FROM node:12.20.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
# EXPOSE 3000
# ENV NODE_ENV=production
# CMD [ "npm", "/app/index.js" ]