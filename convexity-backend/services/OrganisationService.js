const {Organisations} = require('../models');

class OrganisationService {
  static findOneById(id) {
    return Organisations.findByPk(id);
  }
  static async getAllOrganisations() {
    try {
      return await Organisations.findAll();
    } catch (error) {
      throw error;
    }
  }
  static async addOrganisation(data, user) {
    try {
      return await Organisations.create(data).then((organisation) => {
        organisation.createMember({ UserId: user.id, role: 'admin' })
      });
    } catch (error) {
      throw error;
    }
  }

  static async checkExist(id) {
    try {
      return await Organisations.findByPk(id)
    } catch (error) {
      throw error;
    }
  }
  static async checkExistEmail(email) {
    try {
      return await Organisations.findOne({ where: { email: email } })
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
