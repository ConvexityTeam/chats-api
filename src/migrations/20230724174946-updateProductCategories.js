'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('ProductCategories', 'organisation_id');
    await queryInterface.addColumn('ProductCategories', 'organisation_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Organisations',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('ProductCategories', 'organisation_id');
  }
};
