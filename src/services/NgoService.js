const {
  OrgAdminRolesToAcl
} = require("../utils").Types;

const {
  userConst
} = require('../constants')

const {
  User,
  OrganisationMembers
} = require('../models');
const QueueService = require('./QueueService')
const bcrypt = require("bcryptjs");


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

          QueueService.createWallet(user.id, 'user');
          // send password to user
          resolve(user.toObject());
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static getMembers(OrganisationId) {
    return OrganisationMembers.findAll({
      where: { OrganisationId },
      include: [{
        model: User,
        as: 'User',
        attributes: userConst.publicAttr
      }]
    })
  }
};

module.exports = NgoService