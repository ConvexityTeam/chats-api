exports.__esModule = true;
const { connectionURL } = require('../config').rabbitmqConfig
const { Connection } = require("@droidsolutions-oss/amqp-ts");

exports.default = new Connection(connectionURL,{}, { retries: 300000});
