const {
  generateTransactionRef
} = require("../utils");
const {
  Transaction,
  Wallet,
  Sequelize
} = require('../models');
const QueueService = require("./QueueService");

class OrderService {
  static async processOrder(payerWallet, order, vendor, amount) {

    const updateOp = {
      balance: Sequelize.literal(`balance - ${amount}`)
    };

    const channel = payerWallet.Campaign.funded_with;

    if (channel == 'fiat') {
      updateOp['fiat_balance'] = Sequelize.literal(`fiat_balance - ${amount}`)
    }

    if (channel == 'crypto') {
      updateOp['crypto_balance'] = Sequelize.literal(`crypto_balance - ${amount}`)
    }

    order.update({status: 'processing'});

    await Wallet.update(updateOp, {
      where: {
        uuid: payerWallet.uuid
      }
    });

    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'store',
      transaction_type: 'spent',
      SenderWalletId: payerWallet.uuid,
      OrderId: order.id,
      VendorId: vendor.id,
      BeneficiaryId: payerWallet.UserId,
      narration: 'Vendor Order'
    });

    QueueService.processOrder(
      channel,
      payerWallet.uuid,
      vendor.id,
      order.id,
      amount
    );

    // Queue for process
    return transaction;
  }

}

module.exports = OrderService;