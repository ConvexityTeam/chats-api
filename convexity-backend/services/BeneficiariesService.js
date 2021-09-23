const database = require('../models');
const {
  AclRoles
} = require('../utils');

class BeneficiariesService {
  static async getAllUsers() {
    return database.User.findAll({
      where: {
        RoleId: 5
      }
    });
  }

  static async addUser(newUser) {
    return database.User.create(newUser);
  }

  static async updateUser(id, updateUser) {
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

  }

  static async getAUser(id) {
    return database.User.findOne({
      where: {
        id: id,
        RoleId: AclRoles.Beneficiary
      }
    });
  }

  static async getUser(id) {
    return database.User.findOne({
      where: {
        id: id
      },
      include: ['Wallet']
    });
  }
  static async deleteUser(id) {
    const UserToDelete = await database.User.findOne({
      where: {
        id: id
      }
    });

    if (UserToDelete) {
      return database.User.destroy({
        where: {
          id: id
        }
      });
    }
    return null;
  }

  static async checkBeneficiary(id) {
    return database.Beneficiary.findOne({
      where: {
        id: id
      }
    });
  }

  static async createComplaint(data) {
    return database.Complaints.create(data)
  }

  static async updateComplaint(id) {
    return database.Complaints.update({
      status: "resolved"
    }, {
      where: {
        id
      }
    })
  }


  static async checkComplaint(id) {
    return database.Complaints.findOne({
      where: {
        id: id
      }
    });
  }
}

module.exports = BeneficiariesService;