'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Campaigns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      OrganisationMemberId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'OrganisationMembers',
          },
          key: 'id'
        }
      },
      title: {
        type: Sequelize.STRING
      },
      type: {
        allowNull: false,
        type: Sequelize.ENUM('campaign', 'cash-for-work'),
        defaultValue: 'campaign'
      },
      description: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      budget: {
        type: Sequelize.FLOAT,
        defaultValue: 0.00
      },
      location: {
        type: Sequelize.TEXT
      },
      start_date: {
        type: Sequelize.DATE
      },
      end_date: {
        type: Sequelize.DATE
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
    await queryInterface.dropTable('Campaigns');
  }
};
