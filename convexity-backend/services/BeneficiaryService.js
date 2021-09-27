const {
  AclRoles
} = require('../utils');
const {
  User,
  Beneficiary,
  Campaign,
  Wallet,
  Transaction
} = require('../models');
const { Op, Sequelize } = require('sequelize');
const {
  userConst
} = require('../constants');

class BeneficiariesService {
  static async getAllUsers() {
    return User.findAll({
      where: {
        RoleId: 5
      }
    });
  }

  static async addUser(newUser) {
    return User.create(newUser);
  }

  static async updateUser(id, updateUser) {
    const UserToUpdate = await User.findOne({
      where: {
        id: id
      }
    });

    if (UserToUpdate) {
      await User.update(updateUser, {
        where: {
          id: id
        }
      });

      return updateUser;
    }
    return null;

  }

  static async getAUser(id) {
    return User.findOne({
      where: {
        id: id,
        RoleId: AclRoles.Beneficiary
      }
    });
  }

  static async getUser(id) {
    return User.findOne({
      where: {
        id: id
      },
      include: ['Wallet']
    });
  }
  static async deleteUser(id) {
    const UserToDelete = await User.findOne({
      where: {
        id: id
      }
    });

    if (UserToDelete) {
      return User.destroy({
        where: {
          id: id
        }
      });
    }
    return null;
  }

  static async checkBeneficiary(id) {
    return Beneficiary.findOne({
      where: {
        id: id
      }
    });
  }

  static async createComplaint(data) {
    return Complaint.create(data)
  }

  static async updateComplaint(id) {
    return Complaint.update({
      status: "resolved"
    }, {
      where: {
        id
      }
    })
  }


  static async checkComplaint(id) {
    return Complaint.findOne({
      where: {
        id: id
      }
    });
  }

  static async beneficiaryDetails(id) {
    return User.findOne({
      where: {
        id
      },
      attributes: userConst.publicAttr,
      include: [{
          model: Campaign,
          as: 'Campaigns',
          through: {
            attributes: []
          }
        },
        {
          model: Wallet,
          as: "Wallets",
          include: [
            "ReceivedTransactions",
            "SentTransactions"
          ]
        },
      ]
    });
  }

  static async beneficiaryTransactions(UserId) {
    return Transaction.findAll({
      where: {
        [Op.or]: {
          walletSenderId: Sequelize.where(Sequelize.col('SenderWallet.AccountUserId'), UserId),
          walletRecieverId: Sequelize.where(Sequelize.col('RecievingWallet.AccountUserId'), UserId)
        }
      },
      include: [{
          model: Wallet,
          as: "SenderWallet",
          where: {
            AccountUserType: "user",
          },
          attributes: []
        },
        {
          model: Wallet,
          as: "RecievingWallet",
          where: {
            AccountUserType: "user",
          },
          attributes: []
        }
      ]
    });
  }

  static async findOrgnaisationBeneficiaries(OrganisationId) {
    return User.findAll({
      where: {
        OrganisationId: Sequelize.where(Sequelize.col('Campaigns.OrganisationId'), OrganisationId)
      },
      attributes: userConst.publicAttr,
      include: [{
        model: Campaign,
        as: 'Campaigns',
        attributes: []
      }]
    })
  }
}

module.exports = BeneficiariesService;