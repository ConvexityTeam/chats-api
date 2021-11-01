const databaseConfig = require('./database');
const paystackConfig = require('./paystack');
const rabbitmqConfig = require('./rabbitmq');
const tokenConfig = require('./token');
const bantuConfig = require('./bantu');
const awsConfig = require('./aws');

module.exports = {
  databaseConfig,
  paystackConfig,
  rabbitmqConfig,
  tokenConfig,
  bantuConfig,
  awsConfig
}