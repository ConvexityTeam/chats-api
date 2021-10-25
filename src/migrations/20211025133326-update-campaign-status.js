'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    queryInterface.removeColumn('Campaigns', 'status');
    queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.ENUM('pending', 'active', 'paused', 'completed'),
      defaultValue: 'pending'
    });
    queryInterface.addColumn('Campaigns', 'paused_date', {
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
     queryInterface.removeColumn('Campaigns', 'status');
     queryInterface.addColumn('Campaigns', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'pending'
    });
    queryInterface.removeColumn('Campaigns', 'paused_date');
  }
};
