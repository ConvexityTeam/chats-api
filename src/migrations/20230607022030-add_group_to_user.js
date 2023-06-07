'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.addColumn('Users', 'group', {
      allowNull: true,
      type: Sequelize.ENUM(
        'family',
        'community',
        'interest-group',
        'associations'
      ),
      defaultValue: null
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // await queryInterface.removeColumn('Campaigns', 'type');
    await queryInterface.removeColumn('Users', 'group');
  }
};
