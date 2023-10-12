const { generateTransactionRef } = require('../utils');
const { userConst } = require('../constants');
const {
  Transaction,
  User,
  OrderProduct,
  Order,
  Product,
} = require('../models');

const QueueService = require('./QueueService');
const Pagination = require('../utils/pagination');

class OrderService {
  static async processOrder(
    beneficiaryWallet,
    vendorWallet,
    campaignWallet,
    order,
    vendor,
    amount,
    campaign,
  ) {
    order.update({ status: 'processing' });
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
      narration: 'Vendor Order',
    });
    if (campaign.type === 'item') {
      QueueService.processNFTOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        vendor,
        amount,
        transaction.uuid,
      );
    } else {
      QueueService.processOrder(
        beneficiaryWallet,
        vendorWallet,
        campaignWallet,
        order,
        vendor,
        amount,
        transaction.uuid,
      );
    }

    // Queue for process
    return transaction;
  }

  static async productPurchased(OrganisationId, extraClasue = {}) {
    const { page, size } = extraClasue;
    const { limit, offset } = await Pagination.getPagination(page, size);
    const where = extraClasue;
    delete where.page;
    delete where.size;
    const queryOptions = {
      where,
    };
    if (limit && offset) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }
    const gender = await Order.findAndCountAll({
      where: { status: 'confirmed' },
      ...queryOptions,
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store'],
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
                  through: { where: { OrganisationId } },
                },
              ],
            },
          ],
        },
      ],
    });

    const response = Pagination.getPagingData(gender, page, size);
    return response;
  }

  static async productPurchasedBy(id) {
    const product = await Order.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'Vendor',
          attributes: userConst.publicAttr,
          include: ['Store'],
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
                },
              ],
            },
          ],
        },
      ],
    });

    return product;
  }
}
module.exports = OrderService;
