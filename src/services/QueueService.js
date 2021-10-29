const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const { CREATE_WALLET, VERIFY_FIAT_DEPOSIT } = require("../constants/queues.constant");
const { RabbitMq } = require("../libs");

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true
});

const verifyFaitDepositQueue = RabbitMq['default'].declareQueue(VERIFY_FIAT_DEPOSIT, {
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

  static verifyFiatDeposit(payload) {
    verifyFaitDepositQueue.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }
}

module.exports = QueueService;