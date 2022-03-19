const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const { RabbitMq } = require("../libs");
const { CREATE_WALLET, VERIFY_FIAT_DEPOSIT, PROCESS_VENDOR_ORDER, FROM_NGO_TO_CAMPAIGN, PAYSTACK_DEPOSIT, TRANSFER_TO, PAY_FOR_PRODUCT, PAYSTACK_WITHDRAW, PAYSTACK_VENDOR_WITHDRAW, PAYSTACK_BENEFICIARY_WITHDRAW } = require("../constants/queues.constant");

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

const fundVendorBankAccount = RabbitMq['default'].declareQueue(PAYSTACK_VENDOR_WITHDRAW, {
  durable: true
});

const fundBeneficiaryBankAccount = RabbitMq['default'].declareQueue(PAYSTACK_BENEFICIARY_WITHDRAW, {
  durable: true
});

const payForProduct = RabbitMq['default'].declareQueue(PAY_FOR_PRODUCT, {
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

  static processOrder(
      beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount) {
    const payload = {beneficiaryWallet,vendorWallet,campaignWallet, order, vendor, amount};
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

  static fundBeneficiaryBankAccount (bankAccount, campaignWallet, userWallet, user, amount){
    const payload = {bankAccount, campaignWallet, userWallet, user, amount}
    fundBeneficiaryBankAccount.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }

  static fundVendorBankAccount (bankAccount,  userWallet, user, amount){
    const payload = {bankAccount, userWallet, user, amount}
    fundVendorBankAccount.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }

  static payForProduct (vendor, beneficiary,campaignWallet, VendorWallet, BenWallet, product){
   const payload = {vendor, beneficiary,campaignWallet, VendorWallet, BenWallet, product};
    payForProduct.send(
      new Message(payload, {
        contentType: "application/json"
      })
    )
  }
}

module.exports = QueueService;