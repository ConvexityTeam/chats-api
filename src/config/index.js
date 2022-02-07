const databaseConfig = require('./database');
const paystackConfig = require('./paystack');
const rabbitmqConfig = require('./rabbitmq');
const tokenConfig = require('./token');
const bantuConfig = require('./bantu');
const awsConfig = require('./aws');
const termiiConfig = require('./termii');
const mailerConfig = require('./mailer');

module.exports = {
  databaseConfig,
  paystackConfig,
  rabbitmqConfig,
  termiiConfig,
  mailerConfig,
  tokenConfig,
  bantuConfig,
  awsConfig
}