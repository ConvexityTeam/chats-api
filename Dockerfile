# Pull base image.
FROM ubuntu:20.04

# Install Node.js
RUN apt install --yes curl
RUN curl --silent --location https://deb.nodesource.com/setup_4.x | sudo bash -
RUN apt install --yes nodejs
RUN apt install --yes build-essential

WORKDIR /app
COPY package.json ./
RUN npm i
COPY . .

CMD ["node", "/src/index.js"]