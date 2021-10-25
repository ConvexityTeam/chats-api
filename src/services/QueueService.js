const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const { CREATE_WALLET } = require("../constants/queues.constant");
const { RabbitMq } = require("../libs");

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true
});



class QueueService {
  static createWallet(ownerId, wallet_type, CampaignId = null) {
    const payload = {wallet_type, ownerId, CampaignId};
    createWalletQueue.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }
}

module.exports = QueueService;