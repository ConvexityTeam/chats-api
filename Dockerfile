FROM node:14
RUN apt-get update && apt-get install -y openssh-client
CMD ssh -i "./id_rsa" -NL 2345:10.0.3.47:5432 ubuntu@3.138.140.158
WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .
# EXPOSE 3000
# ENV NODE_ENV=production
# CMD [ "npm", "/app/index.js" ]
