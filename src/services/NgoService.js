const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { OrgAdminRolesToAcl } = require('../utils').Types;

const { userConst } = require('../constants');

const {
  User, Campaign, Product, OrganisationMembers,
} = require('../models');

const QueueService = require('./QueueService');
const MailerService = require('./MailerService');
const Pagination = require('../utils/pagination');

class NgoService {
  static createAdminAccount(organisation, data, role, newPassword) {
    const dataCopy = { ...data };
    return new Promise((resolve, reject) => {
      const password = bcrypt.hashSync(newPassword, 10);
      dataCopy.RoleId = OrgAdminRolesToAcl[role];

      User.create({
        ...data,
        password,
      })
        .then(async (user) => {
          await OrganisationMembers.create({
            UserId: user.id,
            OrganisationId: organisation.id,
            role,
          });
          MailerService.sendFieldPassword(
            user.email,
            `${user.first_name} ${user.last_name}`,
            newPassword,
          );
          await QueueService.createWallet(user.id, 'user');
          // send password to user
          resolve(user.toObject());
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  static async getMembers(OrganisationId, extraClause = null) {
    const modifiedClause = { ...extraClause };
    const { page } = modifiedClause;
    const { size } = modifiedClause;
    delete modifiedClause?.page;
    delete modifiedClause?.size;
    const { limit, offset } = await Pagination.getPagination(page, size);

    const options = { ...extraClause };
    if (page && size) {
      options.limit = limit;
      options.offset = offset;
    }
    const members = await OrganisationMembers.findAndCountAll({
      distinct: true,
      ...options,
      where: {
        OrganisationId,
        role: {
          [Op.ne]: 'vendor',
        },
      },
      include: [
        {
          model: User,
          as: 'User',
          attributes: userConst.publicAttr,
        },
      ],
    });
    const response = await Pagination.getPagingData(members, page, limit);
    return response;
  }

  static viewProductVendorOnCampaign() {
    return Campaign.findAll({
      include: [
        {
          model: Product,
          as: 'CampaignProducts',
        },
        { model: User, as: 'CampaignVendors' },
      ],
    });
  }
}

module.exports = NgoService;
