const { Op } = require('sequelize');
const { userConst } = require('../constants');
const {
  Transaction, Sequelize, Wallet, User,
} = require('../models');
const Pagination = require('../utils/pagination');

class TransactionService {
  static async findOrgnaisationTransactions(OrganisationId, extraClause = {}) {
    const modifiedClause = { ...extraClause };
    const { page } = modifiedClause;
    const { size } = modifiedClause;
    const { limit, offset } = await Pagination.getPagination(page, size);
    delete modifiedClause.page;
    delete modifiedClause.size;
    const queryOptions = {};
    if (page && size) {
      queryOptions.offset = offset;
      queryOptions.limit = limit;
    }
    const transaction = await Transaction.findAndCountAll({
      distinct: true,
      where: { OrganisationId },
      ...queryOptions,
      attributes: [
        'OrganisationId',
        'CampaignId',
        'reference',
        'amount',
        'status',
        'transaction_hash',
        'transaction_type',
        'narration',
        'createdAt',
        'updatedAt',
      ],
      include: [
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: [],

          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
              attribute: [],
            },
          ],
        },
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: [],
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
              attribute: [],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    const response = await Pagination.getPagingData(transaction, page, limit);
    return response;
  }

  static async findTransactions(where) {
    return Transaction.findAll({
      where,
      include: [
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: [],
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
            },
          ],
        },
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: [],
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
            },
          ],
        },
      ],
    });
  }

  static async findTransaction(where) {
    return Transaction.findOne({
      where,
      include: [
        {
          model: Wallet,
          as: 'ReceiverWallet',
          attributes: [],
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
            },
          ],
        },
        {
          model: Wallet,
          as: 'SenderWallet',
          attributes: [],
          include: [
            {
              model: User,
              as: 'User',
              attributes: userConst.publicAttr,
            },
          ],
        },
      ],
    });
  }

  static async getTotalTransactionAmount(where = {}) {
    return Transaction.findAll({
      where,
      attributes: [[Sequelize.fn('SUM', Sequelize.col('amount')), 'total']],
      raw: true,
    });
  }

  static async getTotalTransactionAmountAdmin(OrganisationId) {
    return Transaction.findAll({
      where: {
        OrganisationId,
        transaction_type: 'transfer',
      },
    });
  }

  static async getBeneficiaryTotalTransactionAmountAdmin(BeneficiaryId) {
    return Transaction.findAll({
      where: {
        BeneficiaryId,
        transaction_type: 'spent',
      },
    });
  }

  static async getVendorTransaction(VendorId) {
    return Transaction.findAll({
      where: {
        VendorId,
        BeneficiaryId: {
          [Op.ne]: null,
        },
        transaction_type: 'spent',
      },
    });
  }

  static async getAllTransactions() {
    const res = await Transaction.findAll();
    return res;
  }

  static async addTransaction(newTransaction) {
    // return Transfer.processTransfer(userId, element.UserId, element.amount);
    const res = await Transaction.create(newTransaction);
    return res;
  }

  static async updateTransaction(id, updateTransaction) {
    const TransactionToUpdate = await Transaction.findOne({
      where: {
        id: Number(id),
      },
    });

    if (TransactionToUpdate) {
      await Transaction.update(updateTransaction, {
        where: {
          id: Number(id),
        },
      });

      return updateTransaction;
    }
    return null;
  }

  transaction_type;

  static async getATransaction(id) {
    const theTransaction = await Transaction.findOne({
      where: {
        id: Number(id),
      },
    });

    return theTransaction;
  }

  static async getUserATransaction(id) {
    const theTransaction = await Transaction.findOne({
      where: {
        [Op.or]: [
          {
            BeneficiaryId: id,
            VendorId: id,
          },
        ],
      },
    });

    return theTransaction;
  }

  static async deleteTransaction(id) {
    const TransactionToDelete = await Transaction.findOne({
      where: {
        id: Number(id),
      },
    });

    if (TransactionToDelete) {
      const deletedTransaction = await Transaction.destroy({
        where: {
          id: Number(id),
        },
      });
      return deletedTransaction;
    }
    return null;
  }
}

module.exports = TransactionService;
