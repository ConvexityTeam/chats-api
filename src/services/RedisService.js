const { createClient } = require('redis');
const { Logger } = require('../libs');

const RedisClient = createClient({
  socket: {
    port: process.env.REDISport,
    tls: true,
  },
});

class RedisService {
  static async connectRedis() {
    try {
      await RedisClient.connect();
      RedisClient.on('error', (err) => console.log('Redis Client Error', err));
    } catch (error) {
      Logger.error(`Redis ${error}`);
    }
  }
}

module.exports = { RedisService, RedisClient };
