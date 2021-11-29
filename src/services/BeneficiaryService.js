const moment = require('moment')
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
const {
  Op,
  Sequelize
} = require('sequelize');
const {
  userConst
} = require('../constants');
const transaction = require('../models/transaction');




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

  static async beneficiaryDetails(id, extraClause = null) {
    return User.findOne({
      where: {
        ...extraClause,
        id,
        RoleId: AclRoles.Beneficiary
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
            // "ReceivedTransactions",
            "SentTx"
          ]
        },
      ]
    });
  }

  static async beneficiaryProfile(id) {
    return User.findOne({
      where: {
        id,
        RoleId: AclRoles.Beneficiary
      },
      include: [{
          model: Campaign,
          as: 'Campaigns',
          through: {
            attributes: []
          },
          include: ['Organisation']
        },
        {
          model: Wallet,
          as: "Wallets",
        }
      ]
    });
  }

  static async beneficiaryTransactions(UserId) {
    return Transaction.findAll({
      where: {
        [Op.or]: {
          walletSenderId: Sequelize.where(Sequelize.col('SenderWallet.UserId'), UserId),
          walletRecieverId: Sequelize.where(Sequelize.col('ReceiverWallet.UserId'), UserId)
        }
      },
      include: [{
          model: Wallet,
          as: "SenderWallet",
          attributes: {
            exclude: ['privateKey', 'bantuPrivateKey']
          },
          include: [{
            model: User,
            as: 'User',
            attributes: userConst.publicAttr
          }]
        },
        {
          model: Wallet,
          as: "ReceiverWallet",

          attributes: {
            exclude: ['privateKey', 'bantuPrivateKey']
          },
          include: [{
            model: User,
            as: 'User',
            attributes: userConst.publicAttr
          }]
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

  static async getBeneficiaries() {
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary
      }
    });
  }


  static async getBeneficiariesTotalAmount() {
    return User.findAll({
      where: {
        RoleId: AclRoles.Beneficiary
      },
      include: [{
        model: Transaction,
        as: 'OrderTransaction'
      }]
    });
  }

  //get all beneficiaries by marital status
  
}




module.exports = BeneficiariesService;