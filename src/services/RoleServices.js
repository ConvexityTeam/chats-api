const database = require('../models');

class RoleServices {
  static async getAllRoles() {
    try {
      return await database.Role.findAll();
    } catch (error) {
      throw error;
    }
  }

  static async addRole(newRole) {
    try {
      return await database.Role.create(newRole);
    } catch (error) {
      throw error;
    }
  }

  static async updateRole(id, updateRole) {
    try {
      const RoleToUpdate = await database.Role.findOne({
        where: {
          uuid: id
        }
      });

      if (RoleToUpdate) {
        await database.Role.update(updateRole, {
          where: {
            uuid: id
          }
        });

        return updateRole;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  static async getARole(id) {
    try {
      const theRole = await database.Role.findOne({
        where: {
          uuid: id
        },
        include: 'Users'
      });
      return theRole;
    } catch (error) {
      throw error;
    }
  }

  static async deleteRole(id) {
    try {
      const RoleToDelete = await database.Role.findOne({
        where: {
          uuid: id
        }
      });

      if (RoleToDelete) {
        const deletedRole = await database.Role.destroy({
          where: {
            uuid: id
          }
        });
        return deletedRole;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RoleServices;
