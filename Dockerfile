FROM node:18.9.0-alpine
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .
# EXPOSE 3000
# ENV NODE_ENV=production
# CMD [ "npm", "/app/index.js" ]
