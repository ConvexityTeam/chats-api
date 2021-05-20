const database = require('../models');

class BeneficiariesService {
  static async getAllUsers() {
    try {
      return await database.User.findAll({ where: { RoleId: 5 } }); //get all beneficiaries
    } catch (error) {
      throw error;
    }
  }

  static async addUser(newUser) {
    try {
      return await database.User.create(newUser);
    } catch (error) {
      throw error;
    }
  }

  static async updateUser(id, updateUser) {
    try {
      const UserToUpdate = await database.User.findOne({
        where: {
          id: id
        }
      });

      if (UserToUpdate) {
        await database.User.update(updateUser, {
          where: {
            id: id
          }
        });

        return updateUser;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getAUser(id) {
    try {
      const theUser = await database.User.findOne({
        where: {
          id: id, RoleId: 5
        }
      });

      return theUser;
    } catch (error) {
      throw error;
    }
  }

  static async getUser(id) {
    try {
      const user = await database.User.findOne({ where: { id: id }, include: ['Wallet'] });
      return user;
    } catch (error) {
      throw error;
    }
  }


  static async deleteUser(id) {
    try {
      const UserToDelete = await database.User.findOne({
        where: {
          id: id
        }
      });

      if (UserToDelete) {
        const deletedUser = await database.User.destroy({
          where: {
            id: id
          }
        });
        return deletedUser;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async checkBeneficiary(id) {
    try {
      const beneficiary = await database.Beneficiaries.findOne({
        where: {
          id: id
        }
      });
      return beneficiary
    } catch (error) {
      throw error;
    }
  }

  static async createComplaint(data) {
    try {
      const complaint = await database.Complaints.create(data)
      return complaint
    } catch (error) {
      throw error;
    }
  }

  static async updateComplaint(id) {
    try {
      const updated_complaint = await database.Complaints.update({ status: "resolved" }, {
        where: {
          id: id
        }
      })
      return updated_complaint
    } catch (error) {
      throw error;
    }
  }


  static async checkComplaint(id) {
    try {
      const complaint = await database.Complaints.findOne({
        where: {
          id: id
        }
      });
      return complaint
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BeneficiariesService;
