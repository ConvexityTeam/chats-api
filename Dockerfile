FROM node:14
RUN apt-get update && apt-get install -y openssh-client
COPY stage_db /root/stage_db
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .

# EXPOSE 3000
# ENV NODE_ENV=production
# CMD [ "npm", "/app/index.js" ]
