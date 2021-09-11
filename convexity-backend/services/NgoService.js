const {
  AclRoles,
  OrgRoles,
  OrgAdminRolesToAcl
} = require("../utils").Types;

const {
  User,
  Market,
  OrganisationMembers
} = require('../models');

const {
  Message
} = require("@droidsolutions-oss/amqp-ts");
const { GenearteVendorId } = require('../utils');
const OrganisationService = require('./OrganisationService');
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
};

module.exports = NgoService