'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AssociatedCampaigns', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      DonorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Organisations',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      CampaignId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Campaigns',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AssociatedCampaigns');
  }
};
