FROM node:12.20.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .
# ENV NODE_ENV=production
CMD [ "node", "/app/libs/RabbitMQ/Consumers/BlockChainConsumer.js" ]