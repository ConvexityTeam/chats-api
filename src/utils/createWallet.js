const {RabbitMq, Logger} = require('../libs');
const {CREATE_WALLET} = require('../constants/queues.constant');
const {Message} = require('@droidsolutions-oss/amqp-ts');

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true
});
async function createWallet(ownerId, wallet_type, CampaignId = null) {
  const payload = {wallet_type, ownerId, CampaignId};
  Logger.info('wallet payload received');
  createWalletQueue.send(
    new Message(payload, {
      contentType: 'application/json'
    })
  );
}

module.exports = {
  createWallet
};
