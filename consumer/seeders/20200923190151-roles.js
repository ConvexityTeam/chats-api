'use strict';

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
    await queryInterface.bulkInsert('Roles', [
      {
        name: 'Admin',
        description: 'Super Admin User',
        createdAt: "2020-09-23 13:53:47.213913",
        updatedAt: "2020-09-23 13:53:47.213913"
      }, {
        name: 'Sub-Admin',
        description: 'Sub Admin User',
        createdAt: "2020-09-23 13:53:47.213913",
        updatedAt: "2020-09-23 13:53:47.213913"
      }, {
        name: 'Benefactors',
        description: 'Benefactors User',
        createdAt: "2020-09-23 13:53:47.213913",
        updatedAt: "2020-09-23 13:53:47.213913"
      }, {
        name: 'Vendors',
        description: 'Vendors User',
        createdAt: "2020-09-23 13:53:47.213913",
        updatedAt: "2020-09-23 13:53:47.213913"
      }, {
        name: 'Beneficiaries',
        description: 'Beneficiaries User',
        createdAt: "2020-09-23 13:53:47.213913",
        updatedAt: "2020-09-23 13:53:47.213913"
      }], {});
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
