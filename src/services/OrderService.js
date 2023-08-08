const {generateTransactionRef} = require('../utils');
const {userConst, walletConst} = require('../constants');
const {
  Transaction,
  Wallet,
  Sequelize,
  User,
  OrderProduct,
  Order,
  Product
} = require('../models');

const Op = Sequelize.Op;

const QueueService = require('./QueueService');
const {ProductService} = require('.');

class OrderService {
  static async processOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    type
  ) {
    order.update({status: 'processing'});
    const transaction = await Transaction.create({
      amount,
      reference: generateTransactionRef(),
      status: 'processing',
      transaction_origin: 'store',
      transaction_type: 'spent',
      SenderWalletId: campaignWallet.uuid,
      ReceiverWallet: vendorWallet.uuid,
      OrderId: order.id,
      CampaignId: campaign.id,
      OrganisationId: campaign.OrganisationId,
      VendorId: vendor.id,
      BeneficiaryId: beneficiaryWallet.UserId,
      narration: 'Vendor Order'
    });
    if (type === 'item') {
      QueueService.processNFTOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        vendor,
        amount,
        transaction.uuid
      );
    } else {
      QueueService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        vendor,
        amount,
        transaction.uuid
      );
    }

    // Queue for process
    return transaction;
  }

  static async productPurchased(OrganisationId) {
    const gender = await Order.findAll({
      where: {status: 'confirmed'},
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store']
        },
        {
          model: OrderProduct,
          as: 'Cart',
          include: [
            {
              model: Product,
              as: 'Product',
              include: [
                {
                  model: User,
                  as: 'ProductBeneficiaries',
                  attributes: userConst.publicAttr,
                  through: {where: {OrganisationId}}
                }
              ]
            }
          ]
        }
      ]
    });

    return gender;
  }

  static async productPurchasedBy(id) {
    const product = await Order.findOne({
      where: {id},
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store']
        },

        {
          model: OrderProduct,
          as: 'Cart',
          include: [
            {
              model: Product,
              as: 'Product',
              include: [
                {
                  model: User,
                  as: 'ProductBeneficiaries',
                  attributes: userConst.publicAttr
                }
              ]
            }
          ]
        }
      ]
    });

    return product;
  }
}
module.exports = OrderService;
