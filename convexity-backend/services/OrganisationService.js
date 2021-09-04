const database = require('../models');

class OrganisationService {
  static async getAllOrganisations() {
    try {
      return await database.Organisations.findAll();
    } catch (error) {
      throw error;
    }
  }
  static async addOrganisation(data, user) {
    try {
      return await database.Organisations.create(data).then((organisation) => {
        organisation.createMember({ UserId: user.id, role: 'admin' })
      });
    } catch (error) {
      throw error;
    }
  }

  static async checkExist(id) {
    try {
      return await database.Organisations.findByPk(id)
    } catch (error) {
      throw error;
    }
  }
  static async checkExistEmail(email) {
    try {
      return await database.Organisations.findOne({ where: { email: email } })
    } catch (error) {
      throw error;
    }
  }

  static async isMember(organisation, user) {
    try {
      return await database.OrganisationMembers.findOne({
        where: {
          OrganisationId: organisation,
          UserId: user
        }
      })
    } catch (error) {
      throw error;
    }
  }

}

module.exports = OrganisationService;
