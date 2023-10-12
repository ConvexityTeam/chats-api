const axios = require('axios');
const {
  User, BankAccount, OrganisationMembers, Liveness,
} = require('../models');

const Axios = axios.create();
const { AclRoles } = require('../utils');
const { Logger } = require('../libs');
const { userConst } = require('../constants');

class UserService {
  static async createUser(data) {
    const response = await User.create(data);
    return response;
  }

  static async createLiveness(data) {
    const response = await Liveness.create(data);
    return response;
  }

  static async findLiveness(id) {
    const response = await Liveness.findOne({
      where: {
        id,
      },
    });
    return response;
  }

  static async getAllUsers() {
    const response = await User.findAll({
      attributes: userConst.publicAttr,
    });
    return response;
  }

  static async addUser(newUser) {
    return User.create(newUser);
  }

  static async updateUser(id, updateUser) {
    const UserToUpdate = await User.findOne({
      where: {
        id,
      },
    });

    if (UserToUpdate) {
      await User.update(updateUser, {
        where: {
          id,
        },
      });

      return updateUser;
    }
    return null;
  }

  static async getAUser(id) {
    const theUser = await User.findOne({
      where: {
        id,
      },
      attributes: userConst.publicAttr,
    });

    return theUser;
  }

  static async deleteUser(id) {
    const UserToDelete = await User.findOne({
      where: {
        id,
      },
    });

    if (UserToDelete) {
      const deletedUser = await User.destroy({
        where: {
          id,
        },
      });
      return deletedUser;
    }
    return null;
  }

  // Refactored ==============

  static findUser(id, extraClause = null) {
    return User.findOne({
      where: {
        id,
        ...extraClause,
      },
      include: ['liveness'],
      includes: [
        'Store',
        {
          model: OrganisationMembers,
          as: 'AssociatedOrganisations',
          include: ['Organisation'],
        },
      ],
    });
  }

  static async fetchLiveness() {
    const response = await Liveness.findAll();
    return response;
  }

  static findLivenessByUserId(authorizedBy) {
    return Liveness.findOne({
      where: { authorized_by: authorizedBy },
    });
  }

  static findByEmail(email, extraClause = null) {
    return User.findOne({
      where: {
        email,
        ...extraClause,
      },
      include: ['liveness'],
    });
  }

  static findByUsername(username, extraClause = null) {
    return User.findOne({
      where: {
        username,
        ...extraClause,
      },
    });
  }

  static findByPhone(phone, extraClause = null) {
    return User.findOne({
      where: {
        phone,
        ...extraClause,
      },
    });
  }

  static findSingleUser(where) {
    return User.findOne({
      where,
      attributes: userConst.publicAttr,
      include: ['liveness'],
    });
  }

  static findBeneficiary(id = null) {
    return User.findOne({
      where: {
        id,
        RoleId: AclRoles.Beneficiary,

        // ...(OrganisationId && {
        //     OrganisationId: Sequelize.where(Sequelize.col('Campaigns.OrganisationId'),
        // OrganisationId)
        // }
        // )
      },
      attributes: userConst.publicAttr,
    });
  }

  static update(id, data) {
    return User.update(data, {
      where: {
        id,
      },
    });
  }

  static addUserAccount(UserId, data) {
    return BankAccount.create(
      {
        ...data,
        UserId,
      },
      {
        include: ['AccountHolder'],
      },
    );
  }

  static findUserAccounts(UserId) {
    return BankAccount.findAll({
      where: {
        UserId,
      },
      include: {
        model: User,
        as: 'AccountHolder',
        attributes: ['first_name', 'last_name', 'phone', 'dob'],
      },
    });
  }

  static async nin_verification(number, country) {
    try {
      Logger.info('Verifying NIN');
      const NG = 'nin_wo_face';
      const KE = 'ke/national_id';
      const { data } = await Axios.post(
        `https://api.myidentitypay.com/api/v2/biometrics/merchant/data/verification/${
          country === 'Nigeria' ? NG : KE
        }`,
        number,
        {
          headers: {
            'x-api-key': ` ${process.env.IDENTITY_API_KEY}`,
            'app-id': process.env.IDENTITY_APP_ID,
          },
        },
      );
      if (data.status) {
        Logger.info('NIN verified');
      } else {
        Logger.info(`${data.message}`);
      }
      return data;
    } catch (error) {
      Logger.error(`Error Verifying NIN: ${error}`);
      throw error;
    }
  }
}

module.exports = UserService;
