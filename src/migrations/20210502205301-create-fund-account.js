'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FundAccounts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      channel: {
        type: Sequelize.STRING
      },
      OrganisationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Organisations'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      amount: {
        type: Sequelize.STRING
      },
      transactionReference: {
        type: Sequelize.STRING
      },
      status: {
        type: Sequelize.ENUM('processing', 'successful', 'declined'),
        defaultValue: 'processing'
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
    await queryInterface.dropTable('FundAccounts');
  }
};
