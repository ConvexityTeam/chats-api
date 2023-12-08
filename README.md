<a href="https://withconvexity.com">
    <img width="200" src="./chats_logo.svg?width=64" alt="CHATS Logo" />
</a>


# Description

CHATS(Convexity Humanitarian Aid Transfer Solution), enables the transparent transfer of cash and voucher assistance to the beneficiaries while leveraging the blockchain technology for livelihood programs and logistics management for aid distribution.
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


## Contribution Guide
**Fork the Repository:** Start by forking our repository on GitHub. This will create a copy of the project under your GitHub account.

**Set Up Your Development Environment:** Clone the forked repository to your local machine using Git. Install any necessary dependencies as specified in the project's documentation.

**Create a New Branch:** Create a new branch on your local machine.

**Make Changes:** Implement your desired changes or additions to the codebase. Ensure that your code follows the project's coding conventions and style guidelines.

**Test Your Changes:** Before submitting your contribution, make sure to test your changes thoroughly. Use test frameworks (Mocha or QUnit) to automate the process. Once you have run the tests, you have to analyse the results. This will help you to identify any bugs or problems. If there are bugs, fix them before proceeding to commit your changes.

**Commit and Push:** Commit your changes with clear and descriptive commit messages. Push your commits to the branch you created on your forked repository.

**Create a Pull Request (PR):** Go to the original repository on GitHub and locate the "Pull Requests" section. Click on "New pull request" to create a new pull request from your branch to the original repository's main branch. Provide a descriptive title and a detailed description of your changes in the pull request.

**Contribution Approval and Merging:** Once your pull request has been reviewed and approved by the project maintainers, it will be merged into the main branch. Congratulations! Your contribution is now part of the project.

Thank you for considering contributing to our open-source project on GitHub. Your contributions play a vital role in making the project successful and benefiting the CHATS community.

## Code of Conduct

The CHATS team and community are made up of a mixture of professionals from all over the world, working on every product. To that end, we have a few ground rules that we ask people to adhere to. This code applies equally to developers and users.

As contributors and maintainers of CHATS, we are committed to providing a welcoming and inclusive environment for everyone, regardless of background or identity. This code of conduct applies to all spaces managed by the CHATS community. If you believe someone is violating the code of conduct, we ask that you report it by emailing us@chats.cash.

Be respectful: Treat all participants with respect and kindness, regardless of their personal attributes or opinions. Disagreements and debates should be conducted in a civil manner. Inclusive language: Use inclusive language and avoid any form of discriminatory, offensive, or derogatory remarks or jokes. Be mindful of your words' impact on others.

Open-mindedness: Embrace diversity and be open to different ideas, perspectives, and experiences. Foster an environment that encourages collaboration, creativity, and learning from one another.

Be constructive: Provide constructive feedback and engage in discussions that aim to improve the CHATS. Critique ideas, not individuals, and always assume good intentions from others. Respect privacy and boundaries: Obtain consent before sharing personal information about others. Respect the privacy and boundaries of fellow contributors and users.

Report and address issues: If you witness or experience any behavior that violates this code of conduct, promptly report it to the project maintainers. They are committed to maintaining a safe and inclusive community and will take appropriate action to address the issue.

No harassment or discrimination: Harassment, discrimination, or any form of unwelcome behavior based on factors such as race, ethnicity, gender, sexual orientation, disability, religion, or any other protected characteristic will not be tolerated.

Comply with applicable laws: Ensure that your actions and contributions comply with all applicable laws and regulations.

By participating in the CHATS project, you agree to follow this code of conduct throughout all project activities, both online and offline, and in all interactions related to CHATS.

## License
Copyright (C) 2023  Convexity CVA Inc.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
