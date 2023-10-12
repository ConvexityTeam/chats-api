const database = require('../models');

class RoleServices {
  static async getAllRoles() {
    const response = await database.Role.findAll();
    return response;
  }

  static async addRole(newRole) {
    const response = await database.Role.create(newRole);
    return response;
  }

  static async updateRole(id, updateRole) {
    const RoleToUpdate = await database.Role.findOne({
      where: {
        id: Number(id),
      },
    });

    if (RoleToUpdate) {
      await database.Role.update(updateRole, {
        where: {
          id: Number(id),
        },
      });

      return updateRole;
    }
    return null;
  }

  static async getARole(id) {
    const theRole = await database.Role.findOne({
      where: {
        id: Number(id),
      },
      include: 'Users',
    });
    return theRole;
  }

  static async deleteRole(id) {
    const RoleToDelete = await database.Role.findOne({
      where: {
        id: Number(id),
      },
    });

    if (RoleToDelete) {
      const deletedRole = await database.Role.destroy({
        where: {
          id: Number(id),
        },
      });
      return deletedRole;
    }
    return null;
  }
}

module.exports = RoleServices;
