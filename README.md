<a href="https://withconvexity.com">
    <img width="200" src="https://gitlab.com/uploads/-/system/group/avatar/8492718/cropped-chats.png?width=64" alt="CHATS Logo" />
</a>


# Convexity Humanitarian Aid Transfer Solution (CHATS)

Convexity Humanitarian Aid Transfer Solution (CHATS) is an ongoing project aimed at addressing Nigeria’s peculiar Cash & Vouchers Assistance distribution problem and to improve the wellbeing of vulnerable children and their households.
##  Technology Stack
    -NodeJS (preferably ^14.10)
    -PostgresSQL Database
    -Redis
    -Linux (Deb Distribution)
##  Installation
    -Install NodeJS
    -Install PostgresSQL
    -Fork The Code
    -Change into forked directory
    -run `npm i` to install dependencies
    -run `npm i g sequelize-cli` to install sequelize-cli dependencies to install it globally
    -run `touch .env` file to create a new .env file their is a sample of the .env file in the repository
    -run `sequelize-cli db:create` to create a new db on the postgres database, (it is assumed that you have    set the db credentials in the .env file)
    -run `sequelize-cli db:migrate` to create all necessary tables in the database
    -This is an optional step run `sequelize-cli db:seed:all` to populate the table with data

