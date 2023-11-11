'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FormAnswers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true
      },
      formId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'CampaignForms'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      beneficiaryId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Users'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      questions: {
        type: Sequelize.JSON
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
    await queryInterface.dropTable('FormAnswers');
  }
};
