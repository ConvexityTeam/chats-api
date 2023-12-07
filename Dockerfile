# Pull base image.
FROM node:18.10.0

# Install Node.js
# RUN apt-get install --yes curl
# RUN curl --silent --location https://deb.nodesource.com/setup_4.x | sudo bash -
# RUN apt-get install --yes nodejs
# RUN apt-get install --yes build-essential

WORKDIR /
COPY package.json ./
RUN npm i
COPY . .

CMD ["node", "/src/index.js"]
