const {
  AclRoles,
  OrgAdminRolesToAcl
} = require("../utils").Types;

const {
  User,
  Market,
  OrganisationMembers
} = require('../models');
const {
  GenearteVendorId
} = require('../utils');
const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const bcrypt = require("bcryptjs");
const amqp = require("./../libs/RabbitMQ/Connection");
const createWalletQueue = amqp["default"].declareQueue("createWallet", {
  durable: true
});

class NgoService {
  static createAdminAccount(organisation, data, role, creator) {
    return new Promise(async (resolve, reject) => {
      const rawPassword = 'password';
      const password = bcrypt.hashSync(rawPassword, 10);
      data.RoleId = OrgAdminRolesToAcl[role];

      User.create({
          ...data,
          password
        })
        .then(async (user) => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role
          });
          // send password to user
          resolve(user.toObject());
        })
        .catch(err => {
          reject(err);
        });
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
        .then(_account => {
          account = _account;
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

          account = account.toJSON();
          delete account.password;
          delete account.tfa_secret;
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
};

module.exports = NgoService