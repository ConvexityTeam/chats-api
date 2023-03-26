'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    //await queryInterface.removeColumn('Campaigns', 'status');
    await queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.ENUM(
        'pending',
        'ongoing',
        'active',
        'paused',
        'completed',
        'ended'
      ),
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Campaigns', 'status');
  }
};
