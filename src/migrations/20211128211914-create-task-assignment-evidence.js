'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TaskAssignmentEvidences', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      TaskAssignmentId: {
        allowNull: false,
        type: Sequelize.UUID,
        references: {
          model: {
            tableName: 'TaskAssignments'
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      comment: {
        allowNull: false,
        type: Sequelize.TEXT
      },
      uploads: {
        allowNull: true,
        type: Sequelize.ARRAY(Sequelize.STRING)
      },
      type: {
        allowNull: true,
        type: Sequelize.ENUM('image', 'video'),
        defaultValue: null
      },
      source: {
        type: Sequelize.ENUM('beneficiary', 'field_agent', 'vendor')
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
    await queryInterface.dropTable('TaskAssignmentEvidences');
  }
};
