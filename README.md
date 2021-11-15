<a href="https://withconvexity.com">
    <img width="200" src="https://gitlab.com/uploads/-/system/group/avatar/8492718/cropped-chats.png?width=64" alt="CHATS Logo" />
</a>


# Convexity Humanitarian Aid Transfer Solution (CHATS)

Convexity Humanitarian Aid Transfer Solution (CHATS) is an ongoing project aimed at addressing Nigeria’s peculiar Cash & Vouchers Assistance distribution problem and to improve the wellbeing of vulnerable children and their households.
##  Technology Stack
    -NodeJS (preferably ^14.10)
    -PostgresSQL Database
    -Redis
    -RabbitMq
    -Linux (Deb Distribution)
##  Installation
    -Install NodeJS
    -Install PostgresSQL
    -Install Redis Server
    -Install RabbitMQ Server
    -Fork The Code
    -Change into forked directory
    -run `npm i` to install dependencies
    -run `npm i g sequelize-cli` to install sequelize-cli dependencies to install it globally
    -run `cp .env.example .env` This copies the example ENV in the directory to a new .env file.
    -run `sequelize-cli db:create` to create a new db on the postgres database, (it is assumed that you have    set the db credentials in the .env file)
    -run `sequelize-cli db:migrate` to create all necessary tables in the database
    -This is an optional step run `sequelize-cli db:seed:all` to populate the table with data

    -run `npm start` (This starts the app in production mode)
    -run `npm run dev` (This starts the app in development mode with nodemon)
    -run `npm run start:consumer` (This starts the app queue consumer in production mode)
    -run `npm run start:consumer:dev` (This start the app queue consumer in development mode)

##  Run With Docker Compose
    -Install Docker
    -Install Docker Compose
    -run `docker volume create postgres` (This creates docker volume for PostgresSQL Database)
    -run `docker-compose up --build` to build and start all services

