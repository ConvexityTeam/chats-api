'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Campaigns', 'status');
    await queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.ENUM('pending', 'active', 'paused', 'completed'),
      defaultValue: 'pending'
    });
    await queryInterface.addColumn('Campaigns', 'paused_date', {
      type: Sequelize.DATE,
      allowNull: true
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
    await queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'pending'
    });
    await queryInterface.removeColumn('Campaigns', 'paused_date');
  }
};