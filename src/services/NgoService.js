const {
  OrgAdminRolesToAcl
} = require("../utils").Types;
const {Op} = require('sequelize')

const {
  userConst
} = require('../constants')

const {
  User,
  Campaign,
  OrganisationMembers
} = require('../models');
const QueueService = require('./QueueService')
const bcrypt = require("bcryptjs");
const { production } = require("../config/database");


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
      where: { OrganisationId, role: {
        [Op.ne]: 'vendor'
      }},
      include: [{
        model: User,
        as: 'User',
        attributes: userConst.publicAttr
      }]
    })
  }


  static viewProductVendorOnCampaign(){
    return Campaign.findAll({
      include:[{
        model: Product,
        as: 'CampaignProducts'
      }]
    })
  }
};

module.exports = NgoService