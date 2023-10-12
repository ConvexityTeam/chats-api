exports.esModule = true;
const { Connection } = require('@droidsolutions-oss/amqp-ts');
const { connectionURL } = require('../config').rabbitmqConfig;

exports.default = new Connection(
  connectionURL,
  {},
  { interval: 3000, retries: 3000 },
);
