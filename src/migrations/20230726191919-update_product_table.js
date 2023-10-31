'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('VendorProposals', 'quantity');
    await queryInterface.removeColumn('VendorProposals', 'product_id');
    await queryInterface.removeColumn('VendorProposals', 'cost');
    await queryInterface.removeColumn('Products', 'CampaignId');

    await queryInterface.addColumn('Products', 'CampaignId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Campaigns'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addColumn('Products', 'vendor_proposal_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'VendorProposals'
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
    await queryInterface.removeColumn('Products', 'CampaignId');
    await queryInterface.removeColumn('Products', 'vendor_proposal_id');
  }
};
