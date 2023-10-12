require('dotenv').config();

exports.esModule = true;
const { Connection } = require('@droidsolutions-oss/amqp-ts');

exports.default = new Connection(`amqp://${process.env.RABBIT_HOST}`);
