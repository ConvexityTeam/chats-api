'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.removeColumn('Complaints', 'BeneficiaryId');
    await queryInterface.addColumn('Complaints', 'CampaignId', {
      after: 'status',
      allowNull: false,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Campaigns'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.addColumn('Complaints', 'UserId', {
      after: 'CampaignId',
      allowNull: false,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Users'
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
    await queryInterface.addColumn('Complaints', 'BeneficiaryId', {
      allowNull: false,
      type: Sequelize.UUID,
      references: {
        model: {
          tableName: 'Beneficiaries'
        },
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    await queryInterface.removeColumn('Complaints', 'CampaignId');
    await queryInterface.removeColumn('Complaints', 'UserId');
  }
};
