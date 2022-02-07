const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const { RabbitMq } = require("../libs");
const { CREATE_WALLET, VERIFY_FIAT_DEPOSIT, PROCESS_VENDOR_ORDER, FROM_NGO_TO_CAMPAIGN, PAYSTACK_DEPOSIT, TRANSFER_TO } = require("../constants/queues.constant");

const createWalletQueue = RabbitMq['default'].declareQueue(CREATE_WALLET, {
  durable: true
});

const payStackDepositQueue = RabbitMq['default'].declareQueue(PAYSTACK_DEPOSIT, {
  durable: true
});

const verifyFaitDepositQueue = RabbitMq['default'].declareQueue(VERIFY_FIAT_DEPOSIT, {
  durable: true
});

const processOrderQueue = RabbitMq['default'].declareQueue(PROCESS_VENDOR_ORDER, {
  durable: true
});

const approveCampaignAndFund = RabbitMq['default'].declareQueue(FROM_NGO_TO_CAMPAIGN, {
  durable: true
});

const fundBankAccount = RabbitMq['default'].declareQueue(TRANSFER_TO, {
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

  static createPayStack(address, amount) {
    const payload = {address, amount}
    payStackDepositQueue.send(
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

  static processOrder(channel, customerWalletId, vendorUserId, OrderId, amount) {
    const payload = {channel, customerWalletId, vendorUserId, OrderId, amount};
    processOrderQueue.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }

  static CampaignApproveAndFund (payload){
    approveCampaignAndFund.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }

  static fundBankAccount (payload){
    fundBankAccount.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }
}

module.exports = QueueService;