const {
  AclRoles,
  OrgRoles
} = require("../utils").Types;

const {
  User,
  Market,
  OrganisationMembers
} = require('../models');
const {
  GenearteVendorId
} = require('../utils').StringUtil;
const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const bcrypt = require("bcryptjs");
const amqp = require("./../libs/RabbitMQ/Connection");
const createWalletQueue = amqp["default"].declareQueue("createWallet", {
  durable: true
});



class NgoService {
  static createFieldAgentAccount(organisation, data, creator) {
    return new Promise(async (resolve, reject) => {
      const rawPassword = 'password';
      const password = bcrypt.hashSync(rawPassword, 10);
      data.RoleId = AclRoles.FieldAgent;

      User.create({
          ...data,
          password
        })
        .then(async (user) => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role: OrgRoles.FieldAgent
          });
          // send password to user
          const userJSON = user.toJSON();
          delete userJSON['password'];
          delete userJSON['tfa_secret'];
          resolve(userJSON);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static createSubAdminAccount(organisation, data, creator) {
    return new Promise(async (resolve, reject) => {
      const rawPassword = 'password';
      const password = bcrypt.hashSync(rawPassword, 10);
      data.RoleId = AclRoles.NgoSubAdmin;

      User.create({
          ...data,
          password
        })
        .then(async (user) => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role: OrgRoles.SubAdmin
          });
          // send password to user
          const userJSON = user.toJSON();
          delete userJSON['password'];
          delete userJSON['tfa_secret'];
          resolve(userJSON);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static createAdminAccount(organisation, data, creator) {
    return new Promise(async (resolve, reject) => {
      const rawPassword = 'password';
      const password = bcrypt.hashSync(rawPassword, 10);
      data.RoleId = AclRoles.NgoAdmin;

      User.create({
          ...data,
          password
        })
        .then(async (user) => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role: OrgRoles.Admin
          });
          // send password to user
          const userJSON = user.toJSON();
          delete userJSON['password'];
          delete userJSON['tfa_secret'];
          resolve(userJSON);
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