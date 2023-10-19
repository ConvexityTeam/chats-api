'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Campaigns', 'formId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: {
          tableName: 'CampaignForms'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addColumn('Campaigns', 'category_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: {
          tableName: 'ProductCategories'
        },
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
    await queryInterface.dropTable('Campaigns');
  }
};
