'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Campaigns', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      OrganisationMemberId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: {
          model: {
            tableName: 'OrganisationMembers'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING
      },
      type: {
        allowNull: false,
        type: Sequelize.ENUM('campaign', 'cash-for-work'),
        defaultValue: 'campaign'
      },
      spending: {
        allowNull: false,
        type: Sequelize.STRING,
        defaultValue: 'all'
      },
      description: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'pending'
      },
      budget: {
        type: Sequelize.FLOAT,
        defaultValue: 0.0
      },
      location: {
        type: Sequelize.ARRAY(Sequelize.DECIMAL)
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
