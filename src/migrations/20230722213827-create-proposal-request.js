'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProposalRequests', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      campaign_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Campaigns',
          key: 'id'
        },
        OnDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      organisation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Organisations',
          key: 'id'
        },
        OnDelete: 'CASCADE',
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
    await queryInterface.dropTable('ProposalRequests');
  }
};
