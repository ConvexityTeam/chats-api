'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Tasks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      UserId: {
        type: Sequelize.STRING
      },
      CampaignId: {
        type: Sequelize.STRING
      },
      task: { allowNull: false, type: Sequelize.STRING },
      assignee: { allowNull: false, type: Sequelize.STRING },
      supervisor: { type: Sequelize.STRING },
      completion_evidence: { type: Sequelize.STRING },
      status: { type: Sequelize.INTEGER, default: 0 },
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