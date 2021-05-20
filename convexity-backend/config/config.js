require("dotenv").config();

const config = {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_HOST: process.env.DB_HOST,
};

module.exports = {
  development: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    dialect: "postgres",
  },
  test: {
    username: "postgres",
    password: "Hab552",
    database: "chats_test_db",
    host: "127.0.0.1",
    dialect: "postgres",
  },
  production: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    dialect: "postgres",
  },
};
