'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tasks', {
      id: {
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
        type: Sequelize.UUID
      },
      CampaignId: {
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
      },
      name: {allowNull: false, type: Sequelize.STRING},
      description: {allowNull: false, type: Sequelize.STRING},
      amount: {allowNull: false, type: Sequelize.INTEGER},
      status: {
        type: Sequelize.ENUM('fulfilled', 'pending'),
        defaultValue: 'pending'
      },
      approval: {
        type: Sequelize.STRING,
        defaultValue: 'both'
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
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Tasks');
  }
};
