const {
  User,
  Order,
  Product,
  Market,
  Wallet,
  Organisations,
  Transaction,
  OrderProduct,
  OrganisationMembers,
  StoreTransaction
} = require('../models');
const {
  OrgRoles,
  AclRoles,
  GenearteVendorId
} = require('../utils');

const bcrypt = require("bcryptjs");
const amqp = require("./../libs/RabbitMQ/Connection");
const {
  Op,
  Sequelize
} = require('sequelize');
const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const {
  userConst
} = require('../constants');
const createWalletQueue = amqp["default"].declareQueue("createWallet", {
  durable: true
});

class OrganisationService {
  static findOneById(id) {
    return Organisations.findByPk(id);
  }

  static async getAllOrganisations() {
    return Organisations.findAll();
  }

  static async addOrganisation(data, user) {
    return Organisations.create(data).then((organisation) => {
      organisation.createMember({
        UserId: user.id,
        role: OrgRoles.Admin
      })
    });
  }

  static async createMember(UserId, OrganisationId, role) {
    const exisiting = await OrganisationMembers.findOne({
      where: {
        UserId,
        OrganisationId
      }
    });

    if (exisiting) {
      return exisiting;
    }

    return OrganisationMembers.create({
      UserId,
      OrganisationId,
      role
    });
  }

  static async checkExist(id) {

    return Organisations.findByPk(id)
  }

  static async checkExistEmail(email) {
    return Organisations.findOne({
      where: {
        email: email
      }
    });
  }

  static async isMember(organisation, user) {
    return database.OrganisationMembers.findOne({
      where: {
        OrganisationId: organisation,
        UserId: user
      }
    });
  }

  static createVendorAccount(organisation, data, creator) {
    return new Promise((resolve, reject) => {
      let account = null;
      let store = null;

      const {
        address,
        store_name,
        location
      } = data;
      const rawPassword = 'password';
      const RoleId = AclRoles.Vendor;
      const OrganisationId = organisation.id;
      const password = bcrypt.hashSync(rawPassword, 10);
      const vendor_id = GenearteVendorId();

      User.create({
          ...data,
          vendor_id,
          RoleId,
          OrganisationId,
          password
        })
        .then(async _account => {
          account = _account;
          this.createMember(account.id, OrganisationId, OrgRoles.Vendor)
          return Market.create({
            store_name,
            address,
            location,
            UserId: account.id
          })
        })
        .then(_store => {
          store = _store;
          createWalletQueue.send(
            new Message({
              id: account.id,
              type: 'user'
            }, {
              contentType: "application/json"
            })
          );

          // send login password to vendor

          account = account.toObject();
          account.Store = store.toJSON();
          resolve(account);
        })
        .catch(error => {
          if (account && !store) {
            User.destroy({
              where: {
                id: account.id
              }
            });
          }
          reject(error);
        })
    });
  }


  static async beneficiariesTransactions(OrganisationId) {
    return Transaction.findAll({
      where: {
        walletSenderId: Sequelize.where(Sequelize.col('SenderWallet.AccountUserId'), OrganisationId)
      },
      include: [{
          model: Wallet,
          as: 'SenderWallet',
          attributes: [],
          where: {
            AccountUserType: 'organisation',
            CampaignId: {
              [Op.ne]: null
            }
          }
        },

        {
          model: Wallet,
          as: 'RecievingWallet',
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

}

module.exports = OrganisationService;