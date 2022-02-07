'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.dropType
    await queryInterface.addColumn('Beneficiaries', 'source', {
      allowNull: true,
      type: Sequelize.ENUM('beneficiary app', 'field app'),
      after: 'approved'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Beneficiaries', 'source');
  }
};
