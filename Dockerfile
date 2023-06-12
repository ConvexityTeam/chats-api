FROM node:14
RUN apt-get update && apt-get install -y openssh-client
# COPY id_rsa /root/id_rsa
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .

# EXPOSE 3000
# ENV NODE_ENV=production
CMD [ "npm", "run", "start:dev" ]
