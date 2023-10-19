'use strict';
const {AclRoles} = require('../utils');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    await queryInterface.bulkInsert(
      'Roles',
      [
        {
          RoleId: AclRoles.SuperAdmin,
          name: 'Super Admin',
          description: 'Super Admin User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.GodMode,
          name: 'Delegated Admin',
          description: 'GodMode Admin User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.NgoAdmin,
          name: 'Admin',
          description: 'NGO Admin  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.NgoSubAdmin,
          name: 'Sub Admin',
          description: 'NGO Sub Admin  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.FieldAgent,
          name: 'Field Agent',
          description: 'NGO Field Agent  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.Vendor,
          name: 'Vendor',
          description: 'Vendor  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.Beneficiary,
          name: 'Beneficiary',
          description: 'Beneficiary  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.Donor,
          name: 'Donor',
          description: 'Donor  User',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          RoleId: AclRoles.Guest,
          name: 'Guest',
          description: 'Guest  User',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete('Roles', null, {});
  }
};
